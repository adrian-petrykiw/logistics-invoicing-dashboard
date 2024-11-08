import { NextApiRequest, NextApiResponse } from "next";
import {
  Connection,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionMessage,
  VersionedTransaction,
  PublicKey,
} from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import bs58 from "bs58";

const SOL_AMOUNT_FOR_MULTISIG = 0.003;
const SOL_AMOUNT_FOR_USER = 0.002;

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

    // Create funding instructions
    const fundingInstructions = [
      SystemProgram.transfer({
        fromPubkey: adminKeypair.publicKey,
        toPubkey: vaultPda,
        lamports: SOL_AMOUNT_FOR_MULTISIG * LAMPORTS_PER_SOL,
      }),
      SystemProgram.transfer({
        fromPubkey: adminKeypair.publicKey,
        toPubkey: new PublicKey(userWallet),
        lamports: SOL_AMOUNT_FOR_USER * LAMPORTS_PER_SOL,
      }),
    ];

    const latestBlockhash = await connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
      payerKey: adminKeypair.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: fundingInstructions,
    }).compileToV0Message();

    const fundingTx = new VersionedTransaction(messageV0);
    fundingTx.sign([adminKeypair]);

    const fundingSignature = await connection.sendTransaction(fundingTx);

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction({
      signature: fundingSignature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    if (confirmation.value.err) {
      throw new Error(
        `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
      );
    }

    return res.status(200).json({
      success: true,
      signature: fundingSignature,
    });
  } catch (error) {
    console.error("Funding error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fund accounts",
    });
  }
};

export default handler;
