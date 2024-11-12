import {
  Connection,
  TransactionSignature,
  RpcResponseAndContext,
  SignatureResult,
  TransactionConfirmationStrategy,
  PublicKey,
  Commitment,
} from "@solana/web3.js";
import {
  getAccount,
  TokenAccountNotFoundError,
  Account,
} from "@solana/spl-token";

export class SolanaService {
  private static instance: SolanaService;
  private connection: Connection;

  constructor() {
    if (!process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
      throw new Error("SOLANA_RPC_URL environment variable is not set");
    }

    this.connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!, {
      commitment: "confirmed",
    });
  }

  public static getInstance(): SolanaService {
    if (!SolanaService.instance) {
      SolanaService.instance = new SolanaService();
    }
    return SolanaService.instance;
  }

  public getConnection(): Connection {
    return this.connection;
  }

  // Your existing confirmTransaction method
  async confirmTransaction(
    signature: TransactionSignature,
    commitment: Commitment = "confirmed"
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

  // Your existing confirmTransactionWithRetry method
  async confirmTransactionWithRetry(
    signature: TransactionSignature,
    commitment: Commitment = "confirmed",
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

  async getAccount(
    address: string | PublicKey,
    commitment: Commitment = "confirmed",
    maxRetries = 3
  ): Promise<Account> {
    const publicKey =
      typeof address === "string" ? new PublicKey(address) : address;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(
          `Attempt ${
            attempt + 1
          }: Getting token account ${publicKey.toBase58()}`
        );

        const tokenAccount = await getAccount(
          this.connection,
          publicKey,
          commitment
        );

        console.log(
          "Successfully retrieved token account:",
          tokenAccount.address.toBase58()
        );
        return tokenAccount;
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));

        // If it's a TokenAccountNotFoundError, don't retry
        if (error instanceof TokenAccountNotFoundError) {
          throw error;
        }

        // If we haven't reached max retries yet, wait before trying again
        if (attempt < maxRetries - 1) {
          const delay = 1000 * Math.pow(2, attempt); // Exponential backoff
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // If we've exhausted all retries, throw the last error
    throw (
      lastError ||
      new Error(`Failed to get token account after ${maxRetries} attempts`)
    );
  }

  async getAccountInfo(
    address: string | PublicKey,
    commitment: Commitment = "confirmed",
    maxRetries = 3
  ) {
    const publicKey =
      typeof address === "string" ? new PublicKey(address) : address;
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(
          `Attempt ${i + 1} to get account info for ${publicKey.toBase58()}`
        );
        const accountInfo = await this.connection.getAccountInfo(
          publicKey,
          commitment
        );
        if (accountInfo) {
          console.log(`Successfully got account info on attempt ${i + 1}`);
          return accountInfo;
        }
        if (i < maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * Math.pow(2, i))
          );
        }
      } catch (error) {
        console.error(`Attempt ${i + 1} failed:`, error);
        lastError = error;
        if (i < maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * Math.pow(2, i))
          );
        }
      }
    }
    throw (
      lastError ||
      new Error(`Could not get account info after ${maxRetries} attempts`)
    );
  }

  // Helper method for consistent balance fetching
  async getBalance(
    address: string | PublicKey,
    commitment: Commitment = "confirmed"
  ): Promise<number> {
    const publicKey =
      typeof address === "string" ? new PublicKey(address) : address;
    try {
      return await this.connection.getBalance(publicKey, commitment);
    } catch (error) {
      console.error("Error fetching balance:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const solanaService = SolanaService.getInstance();

// Also export Connection type for convenience
export type { Connection };
