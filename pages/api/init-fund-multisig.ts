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
import { USDC_MINT } from "@/utils/constants";

const SOL_AMOUNT_FOR_MULTISIG = 0.003;
const SOL_AMOUNT_FOR_USER = 0.002;

const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log("Init Fund 1");

  try {
    const { userWallet, multisigPda } = req.body;

    if (!userWallet || !multisigPda) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
    console.log("Init Fund 2");

    const connection = new Connection(process.env.SOLANA_RPC_URL!);
    const adminKeypair = Keypair.fromSecretKey(
      bs58.decode(process.env.CB_SERVER_MVP_PK!)
    );

    console.log("Init Fund 3");

    // Get the vault PDA
    const [vaultPda] = multisig.getVaultPda({
      multisigPda: new PublicKey(multisigPda),
      index: 0,
    });

    console.log("Init Fund 4");

    // Get the vault's USDC ATA
    const [ata] = PublicKey.findProgramAddressSync(
      [vaultPda.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), USDC_MINT.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    console.log("Init Fund 5");

    console.log("Transaction addresses:", {
      adminPubkey: adminKeypair.publicKey.toString(),
      userWallet,
      multisigPda,
      vaultPda: vaultPda.toString(),
      ata: ata.toString(),
      usdcMint: USDC_MINT.toString(),
    });

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

    console.log("Init Fund 6");

    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    const messageV0 = new TransactionMessage({
      payerKey: adminKeypair.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions,
    }).compileToV0Message();

    console.log("Init Fund 7");

    const fundingTx = new VersionedTransaction(messageV0);
    fundingTx.sign([adminKeypair]);

    // Log serialized transaction for debugging
    const serializedTx = Buffer.from(fundingTx.serialize()).toString("base64");
    console.log("Serialized transaction:", serializedTx);

    console.log("Init Fund 8");

    await delay(1000);
    console.log("awaited 2");

    try {
      console.log("starting confirmation");

      const { signature, status } =
        await solanaService.sendAndConfirmTransaction(
          fundingTx,
          [adminKeypair],
          connection,
          {
            commitment: "confirmed",
            maxRetries: 5,
            skipPreflight: true,
            timeout: 30000,
          }
        );
      console.log("Init Fund 10");
      console.log("Transaction confirmed:", {
        signature,
        confirmations: status?.confirmations,
        confirmationStatus: status?.confirmationStatus,
      });

      return res.status(200).json({
        success: true,
        signature,
      });
    } catch (err: unknown) {
      console.error("Transaction failed:", err);
      if (
        err instanceof Error &&
        typeof err.message === "string" &&
        err.message.includes("Failed to confirm transaction")
      ) {
        return res.status(200).json({
          success: true,
          warning:
            "Transaction sent but confirmation status unknown. Please check explorer.",
          error: err.message,
        });
      }
      throw err;
    }
  } catch (error) {
    console.error("Funding error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fund accounts",
    });
  }
};

export default handler;
