// pages/api/init-token-ata.ts
import { NextApiRequest, NextApiResponse } from "next";
import {
  Connection,
  Keypair,
  TransactionMessage,
  VersionedTransaction,
  PublicKey,
  TransactionExpiredTimeoutError,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import bs58 from "bs58";
import { solanaService } from "@/services/solana";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { vaultAddress, tokenMint } = req.body;

    if (!vaultAddress || !tokenMint) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const connection = new Connection(process.env.SOLANA_RPC_URL!);
    const adminKeypair = Keypair.fromSecretKey(
      bs58.decode(process.env.CB_SERVER_MVP_PK!)
    );

    // Get the ATA address
    const [ata] = PublicKey.findProgramAddressSync(
      [
        new PublicKey(vaultAddress).toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        new PublicKey(tokenMint).toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const instruction = createAssociatedTokenAccountInstruction(
      adminKeypair.publicKey, // payer
      ata, // ata
      new PublicKey(vaultAddress), // owner
      new PublicKey(tokenMint) // mint
    );

    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    const messageV0 = new TransactionMessage({
      payerKey: adminKeypair.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [instruction],
    }).compileToV0Message();

    const tx = new VersionedTransaction(messageV0);
    tx.sign([adminKeypair]);

    const signature = await connection.sendTransaction(tx, {
      maxRetries: 3,
      skipPreflight: true,
    });

    try {
      await solanaService.confirmTransactionWithRetry(
        signature,
        "confirmed",
        5
      );

      return res.status(200).json({
        success: true,
        signature,
        ata: ata.toBase58(),
      });
    } catch (error) {
      if (error instanceof TransactionExpiredTimeoutError) {
        return res.status(200).json({
          success: true,
          signature,
          ata: ata.toBase58(),
          warning:
            "Transaction sent but confirmation timed out. Check explorer for status.",
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("ATA initialization error:", error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to initialize ATA",
    });
  }
};

export default handler;
