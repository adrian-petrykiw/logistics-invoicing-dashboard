import { Connection, PublicKey, Commitment } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  getMint,
  TokenAccountNotFoundError,
  getAssociatedTokenAddress,
} from "@solana/spl-token";

// Create a singleton connection instance
const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!, {
  commitment: "confirmed",
  confirmTransactionInitialTimeout: 60000,
});

export class TokenBalanceService {
  static USDC_MINT = new PublicKey(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  );

  // Use the singleton connection instead of creating new ones
  private connection: Connection;

  constructor() {
    this.connection = connection;
  }

  async getTokenBalance(
    vaultPda: PublicKey,
    mint: PublicKey,
    commitment: Commitment = "confirmed"
  ): Promise<number> {
    try {
      const ata = await getAssociatedTokenAddress(
        mint,
        vaultPda,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      console.log(
        "RPC URL being used:",
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL
      );
      console.log("Checking ATA:", ata.toBase58());

      let accountInfo = null;
      let attempts = 0;
      while (!accountInfo && attempts < 3) {
        accountInfo = await this.connection.getAccountInfo(ata, {
          commitment: commitment,
        });

        if (!accountInfo) {
          attempts++;
          console.log(`Attempt ${attempts}: Retrying to get account info...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (!accountInfo) {
        console.log("No account info found for ATA after retries");
        return 0;
      }

      let tokenAccount = null;
      attempts = 0;
      while (!tokenAccount && attempts < 3) {
        try {
          tokenAccount = await getAccount(this.connection, ata, commitment);
          console.log("Found token account:", tokenAccount.address.toBase58());
        } catch (e) {
          attempts++;
          if (attempts < 3) {
            console.log(
              `Attempt ${attempts}: Retrying to get token account...`
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      if (!tokenAccount) {
        console.log("Could not get token account after retries");
        return 0;
      }

      const mintInfo = await getMint(this.connection, mint, commitment);

      const balance =
        Number(tokenAccount.amount) / Math.pow(10, mintInfo.decimals);
      console.log({
        rawAmount: tokenAccount.amount.toString(),
        decimals: mintInfo.decimals,
        calculatedBalance: balance,
      });

      return balance;
    } catch (error) {
      console.error("Error in getTokenBalance:", error);
      return 0;
    }
  }
}
