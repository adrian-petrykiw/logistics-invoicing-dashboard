import {
  Connection,
  TransactionSignature,
  RpcResponseAndContext,
  SignatureResult,
  TransactionConfirmationStrategy,
} from "@solana/web3.js";

export class SolanaService {
  constructor(private connection: Connection) {}

  async confirmTransaction(
    signature: TransactionSignature,
    commitment: "processed" | "confirmed" | "finalized" = "confirmed"
  ): Promise<RpcResponseAndContext<SignatureResult>> {
    const latestBlockhash = await this.connection.getLatestBlockhash();

    const strategy: TransactionConfirmationStrategy = {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    };

    try {
      const confirmation = await this.connection.confirmTransaction(
        strategy,
        commitment
      );

      if (confirmation.value.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirmation.value.err)}`
        );
      }

      return confirmation;
    } catch (error) {
      console.error("Transaction confirmation failed:", error);
      throw new Error(
        `Transaction confirmation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async confirmTransactionWithRetry(
    signature: TransactionSignature,
    commitment: "processed" | "confirmed" | "finalized" = "confirmed",
    maxRetries: number = 3,
    initialRetryDelay: number = 1000
  ): Promise<RpcResponseAndContext<SignatureResult>> {
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount < maxRetries) {
      try {
        const confirmation = await this.confirmTransaction(
          signature,
          commitment
        );
        return confirmation;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount++;

        if (retryCount < maxRetries) {
          // Exponential backoff
          const delay = initialRetryDelay * Math.pow(2, retryCount - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("Failed to confirm transaction after retries");
  }
}

// Create singleton instance
export const solanaService = new SolanaService(
  new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!)
);
