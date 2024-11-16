import {
  Connection,
  TransactionSignature,
  RpcResponseAndContext,
  SignatureResult,
  TransactionConfirmationStrategy,
  PublicKey,
  Commitment,
  SignatureStatus,
  VersionedTransaction,
  Signer,
  Transaction,
} from "@solana/web3.js";
import {
  getAccount,
  TokenAccountNotFoundError,
  Account,
} from "@solana/spl-token";

export class SolanaService {
  private static instance: SolanaService;
  private defaultConnection: Connection;

  constructor() {
    if (!process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
      throw new Error("SOLANA_RPC_URL environment variable is not set");
    }
    this.defaultConnection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL!,
      {
        commitment: "confirmed",
      }
    );
  }

  public static getInstance(): SolanaService {
    if (!SolanaService.instance) {
      SolanaService.instance = new SolanaService();
    }
    return SolanaService.instance;
  }

  public getConnection(): Connection {
    return this.defaultConnection;
  }

  async confirmTransactionWithRetry(
    signature: TransactionSignature,
    commitment: Commitment = "confirmed",
    maxRetries: number = 5,
    timeoutMs: number = 30000,
    connection?: Connection
  ): Promise<SignatureStatus | null> {
    const conn = connection || this.defaultConnection;
    const startTime = Date.now();
    let retryCount = 0;

    while (retryCount < maxRetries && Date.now() - startTime < timeoutMs) {
      try {
        console.log(`Confirmation attempt ${retryCount + 1} for ${signature}`);

        const response = await conn.getSignatureStatuses([signature]);
        const status = response.value[0];

        if (status) {
          if (status.err) {
            throw new Error(
              `Transaction failed: ${JSON.stringify(status.err)}`
            );
          }

          if (commitment === "confirmed" && status.confirmations) {
            console.log(
              `Transaction confirmed with ${status.confirmations} confirmations`
            );
            return status;
          }

          if (
            commitment === "finalized" &&
            status.confirmationStatus === "finalized"
          ) {
            console.log("Transaction finalized");
            return status;
          }
        }

        console.log("Waiting before next confirmation check...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        retryCount++;
      } catch (error) {
        console.error(`Confirmation attempt ${retryCount + 1} failed:`, error);
        retryCount++;

        if (retryCount < maxRetries) {
          const delay = 1000 * Math.pow(2, retryCount - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Failed to confirm transaction after ${maxRetries} attempts or ${timeoutMs}ms timeout`
    );
  }

  async sendAndConfirmTransaction(
    transaction: Transaction | VersionedTransaction,
    signers: Array<Signer>,
    connection: Connection = this.defaultConnection,
    options: {
      commitment?: Commitment;
      maxRetries?: number;
      skipPreflight?: boolean;
      preflightCommitment?: Commitment;
      timeout?: number;
    } = {}
  ): Promise<{ signature: string; status: SignatureStatus | null }> {
    const {
      commitment = "confirmed",
      maxRetries = 5,
      skipPreflight = true,
      preflightCommitment = "processed",
      timeout = 30000,
    } = options;

    let signature: string;

    if (transaction instanceof VersionedTransaction) {
      if (!transaction.signatures.length) {
        transaction.sign(signers);
      }
      signature = await connection.sendTransaction(transaction, {
        maxRetries,
        skipPreflight,
        preflightCommitment,
      });
    } else {
      signature = await connection.sendTransaction(transaction, signers, {
        maxRetries,
        skipPreflight,
        preflightCommitment,
      });
    }

    console.log("Transaction sent with signature:", signature);

    const status = await this.confirmTransactionWithRetry(
      signature,
      commitment,
      maxRetries,
      timeout,
      connection
    );

    return { signature, status };
  }

  async sendAndConfirmEncodedTransaction(
    rawTransaction: string | Buffer,
    connection: Connection = this.defaultConnection,
    options: {
      commitment?: Commitment;
      maxRetries?: number;
      skipPreflight?: boolean;
      preflightCommitment?: Commitment;
      timeout?: number;
    } = {}
  ): Promise<{ signature: string; status: SignatureStatus | null }> {
    const {
      commitment = "confirmed",
      maxRetries = 5,
      skipPreflight = true,
      preflightCommitment = "processed",
      timeout = 30000,
    } = options;

    const encodedTx =
      typeof rawTransaction === "string"
        ? rawTransaction
        : rawTransaction.toString("base64");

    const signature = await connection.sendEncodedTransaction(encodedTx, {
      maxRetries,
      skipPreflight,
      preflightCommitment,
    });

    console.log("Encoded transaction sent with signature:", signature);

    const status = await this.confirmTransactionWithRetry(
      signature,
      commitment,
      maxRetries,
      timeout,
      connection
    );

    return { signature, status };
  }

  async sendAndConfirmRawTransaction(
    rawTransaction: Buffer,
    connection: Connection = this.defaultConnection,
    options: {
      commitment?: Commitment;
      maxRetries?: number;
      skipPreflight?: boolean;
      preflightCommitment?: Commitment;
      timeout?: number;
    } = {}
  ): Promise<{ signature: string; status: SignatureStatus | null }> {
    const {
      commitment = "confirmed",
      maxRetries = 5,
      skipPreflight = true,
      preflightCommitment = "processed",
      timeout = 30000,
    } = options;

    const signature = await connection.sendRawTransaction(rawTransaction, {
      maxRetries,
      skipPreflight,
      preflightCommitment,
    });

    console.log("Raw transaction sent with signature:", signature);

    const status = await this.confirmTransactionWithRetry(
      signature,
      commitment,
      maxRetries,
      timeout,
      connection
    );

    return { signature, status };
  }

  async getSolanaAccount(
    address: string | PublicKey,
    commitment: Commitment = "confirmed",
    maxRetries = 3
  ): Promise<Account | null> {
    const publicKey =
      typeof address === "string" ? new PublicKey(address) : address;

    // Single attempt without retries for TokenAccountNotFoundError
    try {
      console.log(`Getting token account ${publicKey.toBase58()}`);
      const tokenAccount = await getAccount(
        this.defaultConnection,
        publicKey,
        commitment
      );
      console.log(
        "Successfully retrieved token account:",
        tokenAccount.address.toBase58()
      );
      return tokenAccount;
    } catch (error) {
      if (error instanceof TokenAccountNotFoundError) {
        console.log("Token account not found for", publicKey.toBase58());
        return null;
      }

      // For other errors, try retries
      let lastError = error;
      for (let attempt = 1; attempt < maxRetries; attempt++) {
        try {
          console.log(`Retry attempt ${attempt} for token account`);
          const tokenAccount = await getAccount(
            this.defaultConnection,
            publicKey,
            commitment
          );
          console.log("Successfully retrieved token account on retry");
          return tokenAccount;
        } catch (retryError) {
          if (retryError instanceof TokenAccountNotFoundError) {
            return null;
          }
          console.error(`Retry ${attempt} failed:`, retryError);
          lastError = retryError;
          if (attempt < maxRetries - 1) {
            const delay = 1000 * Math.pow(2, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
      throw lastError;
    }
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
        const accountInfo = await this.defaultConnection.getAccountInfo(
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
      return await this.defaultConnection.getBalance(publicKey, commitment);
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
