// api/create-multisig.ts
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
    const { userWalletAddress, email } = req.body;

    if (!userWalletAddress || !email) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    if (!process.env.SOLANA_RPC_URL || !process.env.CB_SERVER_MVP_PK) {
      throw new Error("Required environment variables not configured");
    }

    const connection = new Connection(process.env.SOLANA_RPC_URL, "confirmed");
    const feePayer = Keypair.fromSecretKey(
      bs58.decode(process.env.CB_SERVER_MVP_PK)
    );
    const userPublicKey = new PublicKey(userWalletAddress);
    // const createKey = Keypair.generate();
    // const createKey = PublicKey.findProgramAddressSync(
    //   [Buffer.from("squad"), userPublicKey.toBuffer()],
    //   new PublicKey(SQUADS_PROGRAM_ID)
    // )[0];
    const createKey = userPublicKey;

    const [multisigPda] = multisig.getMultisigPda({
      createKey: createKey,
    });

    const programConfigPda = multisig.getProgramConfigPda({})[0];
    const programConfig =
      await multisig.accounts.ProgramConfig.fromAccountAddress(
        connection,
        programConfigPda
      );

    const createIx = await multisig.instructions.multisigCreateV2({
      createKey: createKey,
      creator: feePayer.publicKey,
      multisigPda,
      configAuthority: null,
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

    const blockhash = await connection.getLatestBlockhash();
    const transaction = new Transaction();
    transaction.add(createIx);
    transaction.feePayer = feePayer.publicKey;
    transaction.recentBlockhash = blockhash.blockhash;

    // Only sign with feePayer
    transaction.partialSign(feePayer);

    // Serialize the partially signed transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
    });

    return res.status(200).json({
      serializedTransaction: bs58.encode(serializedTransaction),
      multisigPda: multisigPda.toBase58(),
      createKey: createKey.toBase58(),
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
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

// import { NextApiRequest, NextApiResponse } from "next";
// import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
// import * as multisig from "@sqds/multisig";
// const { Permissions } = multisig.types;
// import bs58 from "bs58";

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse
// ) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   try {
//     const { userWalletAddress, email } = req.body;

//     if (!userWalletAddress || !email) {
//       return res.status(400).json({ error: "Missing required parameters" });
//     }

//     if (!process.env.SOLANA_RPC_URL || !process.env.CB_SERVER_MVP_PK) {
//       throw new Error("Required environment variables not configured");
//     }

//     // Create connection with RPC URL
//     const connection = new Connection(process.env.SOLANA_RPC_URL, "confirmed");

//     // Initialize fee payer from base58 private key
//     const feePayer = Keypair.fromSecretKey(
//       bs58.decode(process.env.CB_SERVER_MVP_PK)
//     );

//     const userPublicKey = new PublicKey(userWalletAddress);

//     // const createKey = Keypair.generate();
//     const createKey = userPublicKey;

//     const [multisigPda] = multisig.getMultisigPda({
//       createKey: createKey,
//     });

//     // Get program config for treasury
//     const programConfigPda = multisig.getProgramConfigPda({})[0];
//     const programConfig =
//       await multisig.accounts.ProgramConfig.fromAccountAddress(
//         connection,
//         programConfigPda
//       );

//     // Create the multisig instruction
//     const createIx = await multisig.instructions.multisigCreateV2({
//       createKey: createKey,
//       creator: feePayer.publicKey,
//       multisigPda,
//       configAuthority: null,
//       threshold: 1,
//       members: [
//         {
//           key: userPublicKey,
//           permissions: Permissions.all(),
//         },
//       ],
//       timeLock: 0,
//       treasury: programConfig.treasury,
//       rentCollector: null,
//     });

//     // Create and send transaction
//     const transaction = new Transaction().add(createIx);
//     transaction.feePayer = feePayer.publicKey;

//     // Sign with both fee payer and createKey
//     transaction.sign(feePayer, createKey);

//     // Send and confirm transaction with retries
//     const signature = await connection.sendRawTransaction(
//       transaction.serialize(),
//       {
//         skipPreflight: false,
//         maxRetries: 3,
//       }
//     );

//     const blockhash = await connection.getLatestBlockhash();
//     transaction.recentBlockhash = blockhash.blockhash;
//     const confirmation = await connection.confirmTransaction({
//       signature,
//       blockhash: blockhash.blockhash,
//       lastValidBlockHeight: blockhash.lastValidBlockHeight,
//     });

//     if (confirmation.value.err) {
//       throw new Error(
//         `Transaction failed: ${confirmation.value.err.toString()}`
//       );
//     }

//     // Log successful creation (optional, helpful for debugging)
//     console.log("Multisig created successfully:", {
//       signature,
//       multisigPda: multisigPda.toBase58(),
//       userWalletAddress,
//     });

//     return res.status(200).json({
//       signature,
//       multisigPda: multisigPda.toBase58(),
//       createKey: createKey.toBase58(),
//     });
//   } catch (error) {
//     console.error("Error creating multisig:", error);
//     return res.status(500).json({
//       error:
//         error instanceof Error ? error.message : "Failed to create multisig",
//       details: error instanceof Error ? error.stack : undefined,
//     });
//   }
// }
