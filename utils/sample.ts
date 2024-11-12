import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { createTransferInstruction } from "@solana/spl-token";
import { toast } from "react-hot-toast"; // Optional but recommended for user feedback

export const useUsdcTransfer = (connection: Connection) => {
  //   const { connection } = useConnection();
  const { publicKey, signTransaction, sendTransaction } = useWallet();

  const createAndExecuteUsdcTransfer = async (params: {
    amount: number;
    recipientAddress: PublicKey;
    senderUsdcAddress: PublicKey;
    recipientUsdcAddress: PublicKey;
  }) => {
    const {
      amount,
      recipientAddress,
      senderUsdcAddress,
      recipientUsdcAddress,
    } = params;

    if (!publicKey || !signTransaction) {
      throw new Error("Wallet not connected");
    }

    try {
      // USDC mint address on Solana mainnet
      const USDC_MINT = new PublicKey(
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
      );

      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        senderUsdcAddress, // source
        recipientUsdcAddress, // destination
        publicKey, // owner
        amount * 10 ** 6 // amount in USDC (6 decimals)
      );

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();

      // Create transaction message
      const message = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [transferInstruction],
      }).compileToV0Message();

      // Create versioned transaction
      const transaction = new VersionedTransaction(message);

      try {
        // Sign transaction
        const signedTransaction = await signTransaction(transaction);

        // Send signed transaction
        const signature = await connection.sendRawTransaction(
          signedTransaction.serialize()
        );

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature);

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }

        toast.success("Transfer successful!");
        console.log("Transfer signature:", signature);
        return signature;
      } catch (error) {
        toast.error("Failed to send transaction");
        console.error("Transaction failed:", error);
        throw error;
      }
    } catch (error) {
      toast.error("Failed to create transaction");
      console.error("Transfer failed:", error);
      throw error;
    }
  };

  return { createAndExecuteUsdcTransfer };
};
