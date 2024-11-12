import { NextApiRequest, NextApiResponse } from "next";
import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
const { Permissions } = multisig.types;
import bs58 from "bs58";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userWallet, email } = req.body;

    if (!userWallet || !email) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    if (
      !process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      !process.env.CB_SERVER_MVP_PK
    ) {
      throw new Error("Required environment variables not configured");
    }

    // Create connection with RPC URL
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
      "confirmed"
    );

    // Initialize fee payer from base58 private key
    const feePayer = Keypair.fromSecretKey(
      bs58.decode(process.env.CB_SERVER_MVP_PK)
    );

    const userPublicKey = new PublicKey(userWallet);
    const createKey = Keypair.generate();
    const [multisigPda] = multisig.getMultisigPda({
      createKey: createKey.publicKey,
    });

    // Get program config for treasury
    const programConfigPda = multisig.getProgramConfigPda({})[0];
    const programConfig =
      await multisig.accounts.ProgramConfig.fromAccountAddress(
        connection,
        programConfigPda
      );

    // Create the multisig instruction
    const createIx = await multisig.instructions.multisigCreateV2({
      createKey: createKey.publicKey,
      creator: feePayer.publicKey,
      multisigPda,
      configAuthority: userPublicKey,
      threshold: 1,
      members: [
        {
          key: userPublicKey,
          permissions: Permissions.all(),
        },
      ],
      timeLock: 0,
      treasury: programConfig.treasury,
      rentCollector: null,
    });

    // Create and send transaction
    const transaction = new Transaction().add(createIx);
    transaction.feePayer = feePayer.publicKey;
    const blockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash.blockhash;

    // Sign with both fee payer and createKey
    transaction.sign(feePayer, createKey);

    // Send and confirm transaction with retries
    const signature = await connection.sendRawTransaction(
      transaction.serialize(),
      {
        skipPreflight: false,
        maxRetries: 3,
      }
    );

    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
    });

    if (confirmation.value.err) {
      throw new Error(
        `Transaction failed: ${confirmation.value.err.toString()}`
      );
    }

    // Log successful creation (optional, helpful for debugging)
    console.log("Multisig created successfully:", {
      signature,
      multisigPda: multisigPda.toBase58(),
      userWallet,
    });

    return res.status(200).json({
      signature,
      multisigPda: multisigPda.toBase58(),
      createKey: createKey.publicKey.toBase58(),
    });
  } catch (error) {
    console.error("Error creating multisig:", error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to create multisig",
      details: error instanceof Error ? error.stack : undefined,
    });
  }
}
