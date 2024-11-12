import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError,
  createTransferInstruction,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  Transaction, // Use Transaction instead of VersionedTransaction
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
const heliusConnection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL!,
  "confirmed"
);

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

// Helper function remains the same
async function getOrCreateAssociatedTokenAccount(
  connection: Connection,
  payer: PublicKey,
  owner: PublicKey
) {
  try {
    const tokenAddress = await getAssociatedTokenAddress(USDC_MINT, owner);

    try {
      await getAccount(connection, tokenAddress);
      return { tokenAddress, createIx: undefined };
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        const createIx = createAssociatedTokenAccountInstruction(
          payer,
          tokenAddress,
          owner,
          USDC_MINT
        );
        return { tokenAddress, createIx };
      }
      throw error;
    }
  } catch (error: any) {
    throw new Error(`Failed to get or create token account: ${error.message}`);
  }
}

// createAndExecuteUsdcTransfer.ts
export async function createUsdcTransferTransaction(params: {
  amount: number;
  recipientWallet: PublicKey;
  connection: Connection;
  publicKey: PublicKey;
}) {
  const { amount, recipientWallet, connection, publicKey } = params;

  if (!publicKey) {
    throw new Error("Wallet not connected");
  }

  try {
    // Get sender's token account
    const { tokenAddress: senderUsdcAddress } =
      await getOrCreateAssociatedTokenAccount(connection, publicKey, publicKey);

    // Get recipient's token account
    const { tokenAddress: recipientUsdcAddress, createIx } =
      await getOrCreateAssociatedTokenAccount(
        connection,
        publicKey,
        recipientWallet
      );

    // Create transfer instruction
    const transferIx = createTransferInstruction(
      senderUsdcAddress,
      recipientUsdcAddress,
      publicKey,
      amount * 10 ** 6
    );

    // Build instructions array
    const instructions = createIx ? [createIx, transferIx] : [transferIx];

    // Create a new transaction
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    const transaction = new Transaction({
      feePayer: publicKey,
      blockhash,
      lastValidBlockHeight,
    });

    // Add instructions to transaction
    transaction.add(...instructions);

    return { transaction, blockhash, lastValidBlockHeight };
  } catch (error) {
    console.error("Failed to create transaction:", error);
    throw error;
  }
}
