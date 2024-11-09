import { NextApiRequest, NextApiResponse } from "next";
import {
  Connection,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionMessage,
  VersionedTransaction,
  PublicKey,
  TransactionExpiredTimeoutError,
} from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import bs58 from "bs58";
import { solanaService } from "@/services/solana";

const SOL_AMOUNT_FOR_MULTISIG = 0.003;
const SOL_AMOUNT_FOR_USER = 0.002;

// USDC mint address
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userWallet, multisigPda } = req.body;

    if (!userWallet || !multisigPda) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const connection = new Connection(process.env.SOLANA_RPC_URL!);
    const adminKeypair = Keypair.fromSecretKey(
      bs58.decode(process.env.CB_SERVER_MVP_PK!)
    );

    // Get the vault PDA
    const [vaultPda] = multisig.getVaultPda({
      multisigPda: new PublicKey(multisigPda),
      index: 0,
    });

    // Get the vault's USDC ATA
    const [ata] = PublicKey.findProgramAddressSync(
      [vaultPda.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), USDC_MINT.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const instructions = [
      // Fund the vault with SOL
      SystemProgram.transfer({
        fromPubkey: adminKeypair.publicKey,
        toPubkey: vaultPda,
        lamports: SOL_AMOUNT_FOR_MULTISIG * LAMPORTS_PER_SOL,
      }),
      // Fund the user with SOL
      SystemProgram.transfer({
        fromPubkey: adminKeypair.publicKey,
        toPubkey: new PublicKey(userWallet),
        lamports: SOL_AMOUNT_FOR_USER * LAMPORTS_PER_SOL,
      }),
      // Create USDC ATA for the vault
      createAssociatedTokenAccountInstruction(
        adminKeypair.publicKey, // payer
        ata, // ata
        vaultPda, // owner
        USDC_MINT // mint
      ),
    ];

    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    const messageV0 = new TransactionMessage({
      payerKey: adminKeypair.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions,
    }).compileToV0Message();

    const fundingTx = new VersionedTransaction(messageV0);
    fundingTx.sign([adminKeypair]);

    const fundingSignature = await connection.sendTransaction(fundingTx, {
      maxRetries: 3,
      skipPreflight: true,
    });

    try {
      await solanaService.confirmTransactionWithRetry(
        fundingSignature,
        "confirmed",
        5
      );

      return res.status(200).json({
        success: true,
        signature: fundingSignature,
      });
    } catch (confirmError) {
      if (confirmError instanceof TransactionExpiredTimeoutError) {
        return res.status(200).json({
          success: true,
          signature: fundingSignature,
          warning:
            "Transaction sent but confirmation timed out. Check explorer for status.",
        });
      }
      throw confirmError;
    }
  } catch (error) {
    console.error("Funding error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fund accounts",
    });
  }
};

export default handler;
