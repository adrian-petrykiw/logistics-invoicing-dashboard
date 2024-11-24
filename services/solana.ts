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
  ComputeBudgetProgram,
  TransactionMessage,
} from "@solana/web3.js";
import {
  getAccount,
  TokenAccountNotFoundError,
  Account,
} from "@solana/spl-token";
import bs58 from "bs58";

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
    maxRetries: number = 10,
    timeoutMs: number = 60000,
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
        await new Promise((resolve) => setTimeout(resolve, 2000));
        retryCount++;
      } catch (error) {
        console.error(`Confirmation attempt ${retryCount + 1} failed:`, error);
        retryCount++;

        if (retryCount < maxRetries) {
          const delay = 2000 * Math.pow(2, retryCount - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    console.error(
      `Failed to confirm transaction after ${maxRetries} attempts or ${timeoutMs}ms timeout`
    );

    return null;
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

  // Add/update these methods in your SolanaService class

  async getPriorityFeeEstimate(
    transaction: Transaction,
    feePayer: PublicKey,
    isAtomic: boolean = false
  ): Promise<number> {
    try {
      // Clone the transaction to avoid modifying the original
      const tempTx = new Transaction().add(...transaction.instructions);
      tempTx.feePayer = feePayer;

      const { blockhash } = await this.defaultConnection.getLatestBlockhash(
        "confirmed"
      );
      tempTx.recentBlockhash = blockhash;

      // For atomic transactions, we need to include all account keys
      const message = tempTx.compileMessage();
      const accountKeys = message.accountKeys.map((key) => key.toBase58());

      // Log account keys for debugging atomic transactions
      if (isAtomic) {
        console.log("Atomic transaction account keys:", accountKeys);
      }

      const response = await fetch(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "helius-priority-fee",
          method: "getPriorityFeeEstimate",
          params: [
            {
              accountKeys,
              options: {
                priorityLevel: "High",
                includeVote: false,
              },
            },
          ],
        }),
      });

      const data = await response.json();
      if (data.error) {
        console.error("Priority fee API error:", data.error);
        return isAtomic ? 100000 : 50000; // Higher fallback for atomic txs
      }

      console.log("Priority fee estimate:", data.result.priorityFeeEstimate);
      return data.result.priorityFeeEstimate;
    } catch (error) {
      console.error("Failed to get priority fee estimate:", error);
      return isAtomic ? 100000 : 50000; // Higher fallback for atomic txs
    }
  }

  async addPriorityFee(
    transaction: Transaction,
    feePayer: PublicKey,
    isAtomic: boolean = false
  ): Promise<Transaction> {
    const priorityFee = await this.getPriorityFeeEstimate(
      transaction,
      feePayer,
      isAtomic
    );
    console.log(`priorityFee in addPriorityFee is:`, priorityFee);

    const computeUnits = await this.estimateComputeUnits(
      transaction,
      this.defaultConnection,
      feePayer,
      isAtomic
    );
    console.log(`computeUnits in addPriorityFee is:`, computeUnits);

    const modifiedTx = new Transaction();
    modifiedTx.feePayer = feePayer;

    // Add compute unit instructions
    modifiedTx.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: priorityFee,
      }),
      ComputeBudgetProgram.setComputeUnitLimit({
        units: computeUnits,
      })
    );

    // Add original instructions and preserve feePayer
    transaction.instructions.forEach((ix) => modifiedTx.add(ix));

    return modifiedTx;
  }

  async estimateComputeUnits(
    transaction: Transaction,
    connection: Connection,
    feePayer: PublicKey,
    isAtomic: boolean = false
  ): Promise<number> {
    try {
      const simTx = new Transaction().add(...transaction.instructions);
      simTx.feePayer = feePayer;

      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      simTx.recentBlockhash = blockhash;

      const messageV0 = new TransactionMessage({
        payerKey: feePayer,
        recentBlockhash: blockhash,
        instructions: simTx.instructions,
      }).compileToV0Message();

      const versionedTx = new VersionedTransaction(messageV0);

      const simulation = await connection.simulateTransaction(versionedTx, {
        sigVerify: false,
        replaceRecentBlockhash: true,
        commitment: "confirmed",
      });

      if (simulation.value.err) {
        console.warn("Transaction simulation failed:", simulation.value.err);
        return this.getBaselineComputeUnits(transaction, isAtomic);
      }

      const unitsUsed = simulation.value.unitsConsumed || 0;
      const bufferMultiplier = isAtomic ? 1.5 : 1.3; // Higher buffer for atomic txs
      const estimatedUnits = Math.ceil(unitsUsed * bufferMultiplier);

      const minUnits = isAtomic ? 300_000 : 200_000; // Higher minimum for atomic txs
      const maxUnits = 1_400_000;

      const baselineUnits = this.getBaselineComputeUnits(transaction, isAtomic);

      const finalUnits = Math.max(
        Math.min(Math.max(estimatedUnits, baselineUnits, minUnits), maxUnits),
        minUnits
      );

      console.log({
        isAtomic,
        simulatedUnits: unitsUsed,
        estimatedWithBuffer: estimatedUnits,
        baselineEstimate: baselineUnits,
        finalUnits,
      });

      return finalUnits;
    } catch (error) {
      console.error("Error estimating compute units:", error);
      return this.getBaselineComputeUnits(transaction, isAtomic);
    }
  }

  getBaselineComputeUnits(
    transaction: Transaction,
    isAtomic: boolean = false
  ): number {
    const instructionCounts = transaction.instructions.reduce(
      (counts, ix) => {
        if (
          ix.programId.equals(
            new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
          )
        ) {
          counts.splTokenOps++;
        }
        if (ix.data.length > 0) {
          counts.memoSize += ix.data.length;
        }
        if (
          ix.programId.equals(
            new PublicKey("SMPLecH534NA9acpos4G6x7uf3LWbCAwZQE9e8ZekMu")
          )
        ) {
          counts.squadsOps++;
        }
        return counts;
      },
      {
        splTokenOps: 0,
        memoSize: 0,
        squadsOps: 0,
      }
    );

    const baseUnits = isAtomic ? 300_000 : 200_000;
    const splTokenUnits = instructionCounts.splTokenOps * 50_000;
    const memoUnits = Math.ceil(instructionCounts.memoSize * 100);
    const squadsUnits = instructionCounts.squadsOps * 75_000; // Additional units for Squads operations

    return baseUnits + splTokenUnits + memoUnits + squadsUnits;
  }

  // async getPriorityFeeEstimate(
  //   transaction: Transaction,
  //   feePayer: PublicKey
  // ): Promise<number> {
  //   try {
  //     // Clone the transaction to avoid modifying the original
  //     const tempTx = new Transaction().add(...transaction.instructions);

  //     // Set the actual fee payer
  //     tempTx.feePayer = feePayer;

  //     // Get a recent blockhash
  //     const { blockhash } = await this.defaultConnection.getLatestBlockhash(
  //       "confirmed"
  //     );
  //     tempTx.recentBlockhash = blockhash;

  //     // const serializedTx = bs58.encode(
  //     //   tempTx.serialize({
  //     //     requireAllSignatures: false,
  //     //     verifySignatures: false,
  //     //   })
  //     // );

  //     // console.log(
  //     //   "serializedTx with priority fee: ",
  //     //   tempTx.serializeMessage().toString("base64")
  //     // );

  //     // Alternative approach: use accountKeys directly
  //     const message = tempTx.compileMessage();
  //     const accountKeys = message.accountKeys.map((key) => key.toBase58());

  //     const response = await fetch(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         jsonrpc: "2.0",
  //         id: "helius-priority-fee",
  //         method: "getPriorityFeeEstimate",
  //         params: [
  //           {
  //             accountKeys, // Use the actual account keys instead of serialized transaction
  //             options: {
  //               priorityLevel: "High",
  //               includeVote: false,
  //             },
  //           },
  //         ],
  //       }),
  //     });
  //     const data = await response.json();
  //     if (data.error) {
  //       console.error("Priority fee API error:", data.error);
  //       return 50000; // Fallback fee if API returns error
  //     }

  //     console.log("Priority fee estimate:", data.result.priorityFeeEstimate);
  //     return data.result.priorityFeeEstimate;
  //   } catch (error) {
  //     console.error("Failed to get priority fee estimate:", error);
  //     return 50000; // Fallback priority fee in case of API error
  //   }
  // }

  // async addPriorityFee(
  //   transaction: Transaction,
  //   feePayer: PublicKey
  // ): Promise<Transaction> {
  //   const priorityFee = await this.getPriorityFeeEstimate(
  //     transaction,
  //     feePayer
  //   );
  //   console.log("priorityFee in addPriorityFee is:", priorityFee);

  //   const computeUnits = await this.estimateComputeUnits(
  //     transaction,
  //     this.defaultConnection,
  //     feePayer
  //   );
  //   console.log("computeUnits in addPriorityFee is:", computeUnits);

  //   const modifiedTx = new Transaction();

  //   // Add compute unit price instruction first
  //   modifiedTx.add(
  //     ComputeBudgetProgram.setComputeUnitPrice({
  //       microLamports: priorityFee,
  //     })
  //   );

  //   // Add compute unit limit instruction with dynamic estimation
  //   modifiedTx.add(
  //     ComputeBudgetProgram.setComputeUnitLimit({
  //       units: computeUnits,
  //     })
  //   );

  //   // Add all original instructions
  //   transaction.instructions.forEach((ix) => modifiedTx.add(ix));

  //   return modifiedTx;
  // }

  // async estimateComputeUnits(
  //   transaction: Transaction,
  //   connection: Connection,
  //   feePayer: PublicKey
  // ): Promise<number> {
  //   try {
  //     // Create a new Transaction with the original instructions
  //     const simTx = new Transaction().add(...transaction.instructions);
  //     simTx.feePayer = feePayer;

  //     // Get recent blockhash for simulation
  //     const { blockhash, lastValidBlockHeight } =
  //       await connection.getLatestBlockhash("confirmed");
  //     simTx.recentBlockhash = blockhash;

  //     // Convert to VersionedTransaction
  //     const messageV0 = new TransactionMessage({
  //       payerKey: feePayer,
  //       recentBlockhash: blockhash,
  //       instructions: simTx.instructions,
  //     }).compileToV0Message();

  //     const versionedTx = new VersionedTransaction(messageV0);

  //     // Simulate the transaction with the new method
  //     const simulation = await connection.simulateTransaction(versionedTx, {
  //       sigVerify: false,
  //       replaceRecentBlockhash: true,
  //       commitment: "confirmed",
  //     });

  //     if (simulation.value.err) {
  //       console.warn("Transaction simulation failed:", simulation.value.err);
  //       return this.getBaselineComputeUnits(transaction);
  //     }

  //     // Extract compute units consumed from simulation
  //     const unitsUsed = simulation.value.unitsConsumed || 0;

  //     // Add a 30% buffer for safety
  //     const estimatedUnits = Math.ceil(unitsUsed * 1.3);

  //     // Enforce minimum and maximum limits
  //     const minUnits = 200_000; // Minimum for most basic transactions
  //     const maxUnits = 1_400_000; // Maximum allowed by Solana

  //     // Baseline estimates for common operations
  //     const baselineUnits = this.getBaselineComputeUnits(transaction);

  //     // Take the maximum of our different estimates
  //     const finalUnits = Math.max(
  //       Math.min(Math.max(estimatedUnits, baselineUnits, minUnits), maxUnits),
  //       minUnits
  //     );

  //     console.log({
  //       simulatedUnits: unitsUsed,
  //       estimatedWithBuffer: estimatedUnits,
  //       baselineEstimate: baselineUnits,
  //       finalUnits,
  //     });

  //     return finalUnits;
  //   } catch (error) {
  //     console.error("Error estimating compute units:", error);
  //     // Fallback to baseline estimation if simulation fails
  //     return this.getBaselineComputeUnits(transaction);
  //   }
  // }

  // getBaselineComputeUnits(transaction: Transaction): number {
  //   // Count different types of instructions
  //   const instructionCounts = transaction.instructions.reduce(
  //     (counts, ix) => {
  //       // Check for common instruction types
  //       if (
  //         ix.programId.equals(
  //           new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
  //         )
  //       ) {
  //         // SPL Token Program
  //         counts.splTokenOps++;
  //       }
  //       if (ix.data.length > 0) {
  //         // Roughly estimate memo size
  //         counts.memoSize += ix.data.length;
  //       }
  //       return counts;
  //     },
  //     {
  //       splTokenOps: 0,
  //       memoSize: 0,
  //     }
  //   );

  //   // Base computation for different operations
  //   const baseUnits = 200_000; // Base units for simple transactions
  //   const splTokenUnits = instructionCounts.splTokenOps * 50_000; // Additional units per SPL token operation
  //   const memoUnits = Math.ceil(instructionCounts.memoSize * 100); // Units for memo data

  //   return baseUnits + splTokenUnits + memoUnits;
  // }

  // async addPriorityFee(
  //   transaction: Transaction,
  //   feePayer: PublicKey
  // ): Promise<Transaction> {
  //   const priorityFee = await this.getPriorityFeeEstimate(
  //     transaction,
  //     feePayer
  //   );

  //   const modifiedTx = new Transaction();

  //   // Add compute unit price instruction first
  //   modifiedTx.add(
  //     ComputeBudgetProgram.setComputeUnitPrice({
  //       microLamports: priorityFee,
  //     })
  //   );

  //   // Add compute unit limit instruction
  //   modifiedTx.add(
  //     ComputeBudgetProgram.setComputeUnitLimit({
  //       units: 200000, // You can adjust this based on your needs
  //     })
  //   );

  //   // Add all original instructions
  //   transaction.instructions.forEach((ix) => modifiedTx.add(ix));

  //   return modifiedTx;
  // }
}

// Export singleton instance
export const solanaService = SolanaService.getInstance();

// Also export Connection type for convenience
export type { Connection };
