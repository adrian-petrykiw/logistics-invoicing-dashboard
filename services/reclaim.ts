import {
  Connection,
  PublicKey,
  TransactionMessage,
  TransactionInstruction,
  Signer,
} from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import { ReclaimProofRequest } from "@reclaimprotocol/js-sdk";
import { createClient } from "@supabase/supabase-js";
import {
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";

// Constants
const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

export class TransactionService {
  static async createTransferInstructions({
    from,
    to,
    amount,
    memo,
  }: {
    from: PublicKey;
    to: PublicKey;
    amount: number;
    memo: string;
  }) {
    // Convert amount to USDC decimals (6)
    const adjustedAmount = amount * Math.pow(10, 6);

    // Get the token accounts for sender and recipient
    const fromATA = await getAssociatedTokenAddress(USDC_MINT, from, true);
    const toATA = await getAssociatedTokenAddress(USDC_MINT, to, true);

    // Create the transfer instruction
    const transferInstruction = createTransferInstruction(
      fromATA, // from (associated token account)
      toATA, // to (associated token account)
      from, // owner
      BigInt(Math.round(adjustedAmount)),
      [], // no additional signers
      TOKEN_PROGRAM_ID
    );

    // Create the memo instruction
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memo, "utf-8"),
    });

    return [transferInstruction, memoInstruction];
  }

  private static async getProofRequest(businessData: any): Promise<string> {
    // Initialize Reclaim
    const reclaimRequest = await ReclaimProofRequest.init(
      process.env.NEXT_PUBLIC_RECLAIM_APP_ID!,
      process.env.NEXT_PUBLIC_RECLAIM_APP_SECRET!,
      process.env.NEXT_PUBLIC_RECLAIM_PROVIDER_ID!
    );

    // Add context for the proof (use business data hash or identifier)
    reclaimRequest.addContext("business-data", JSON.stringify(businessData));

    // Set any required parameters
    reclaimRequest.setParams({
      // Add any required parameters for your proof
      timestamp: Date.now().toString(),
      data: JSON.stringify(businessData),
    });

    // Get the proof request URL - this will contain the encrypted data
    const proofRequestUrl = await reclaimRequest.getRequestUrl();

    // Convert the request to a JSON string that can be stored
    const proofRequestJson = reclaimRequest.toJsonString();

    return proofRequestJson;
  }

  static async createAndExecuteTransaction(params: {
    connection: Connection;
    multisigPda: PublicKey;
    vaultPda: PublicKey;
    invoices: Array<{
      number: string;
      amount: number;
      recipient: string;
    }>;
    businessData: any;
    wallet: Signer;
  }) {
    const {
      connection,
      multisigPda,
      vaultPda,
      invoices,
      businessData,
      wallet,
    } = params;

    try {
      // 1. Get recipient wallet from Supabase
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // 2. Create proof request with business data
      const proofRequestJson = await this.getProofRequest(businessData);

      // 3. Create all instructions
      const allInstructions: TransactionInstruction[] = [];

      // Create transfer and memo instructions for each invoice
      for (const invoice of invoices) {
        const [transferInstruction, memoInstruction] =
          await this.createTransferInstructions({
            from: vaultPda,
            to: new PublicKey(invoice.recipient),
            amount: invoice.amount,
            memo: JSON.stringify({
              invoice: invoice.number,
              proofRequest: proofRequestJson,
            }),
          });

        allInstructions.push(transferInstruction, memoInstruction);
      }

      // 4. Get latest transaction index
      const multisigInfo = await multisig.accounts.Multisig.fromAccountAddress(
        connection,
        multisigPda
      );

      const currentTransactionIndex = Number(multisigInfo.transactionIndex);
      const newTransactionIndex = BigInt(currentTransactionIndex + 1);

      // 5. Create and send transaction
      const message = new TransactionMessage({
        payerKey: vaultPda,
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
        instructions: allInstructions,
      });

      const signature = await multisig.rpc.vaultTransactionCreate({
        connection,
        feePayer: wallet,
        multisigPda,
        transactionIndex: newTransactionIndex,
        creator: wallet.publicKey,
        vaultIndex: 0,
        ephemeralSigners: 0,
        transactionMessage: message,
        memo: proofRequestJson, // Store the proof request in the transaction memo
      });

      await connection.confirmTransaction(signature);

      return {
        signature,
        proofRequestJson,
        transactionIndex: newTransactionIndex,
      };
    } catch (error) {
      console.error("Transaction creation error:", error);
      throw new Error(
        `Failed to create and execute transaction: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  static async executeTransaction(params: {
    connection: Connection;
    multisigPda: PublicKey;
    transactionIndex: bigint;
    wallet: Signer; // Changed to wallet
  }) {
    const { connection, multisigPda, transactionIndex, wallet } = params;

    try {
      const signature = await multisig.rpc.vaultTransactionExecute({
        connection,
        feePayer: wallet, // Add feePayer
        multisigPda,
        transactionIndex,
        member: wallet.publicKey,
        signers: [wallet], // Add wallet as signer
      });

      await connection.confirmTransaction(signature);

      return signature;
    } catch (error) {
      console.error("Transaction execution error:", error);
      throw new Error(
        `Failed to execute transaction: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
