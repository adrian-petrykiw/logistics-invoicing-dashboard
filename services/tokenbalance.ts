import { Connection, PublicKey } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getMint,
  TokenAccountNotFoundError,
} from "@solana/spl-token";

export class TokenBalanceService {
  // USDC token mint on Mainnet
  static USDC_MINT = new PublicKey(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  );

  constructor(private connection: Connection) {}

  async getTokenBalance(vaultPda: PublicKey, mint: PublicKey): Promise<number> {
    try {
      // Get associated token account for the vault
      const ata = await this.findAssociatedTokenAccount(vaultPda, mint);

      try {
        // Get token account info
        const tokenAccount = await getAccount(this.connection, ata);

        // Get mint info for decimals
        const mintInfo = await getMint(this.connection, mint);

        // Calculate actual balance
        return Number(tokenAccount.amount) / Math.pow(10, mintInfo.decimals);
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          console.log("Token account not found - likely not created yet");
          return 0;
        }
        throw error;
      }
    } catch (error) {
      console.error("Error fetching token balance:", error);
      return 0;
    }
  }

  private async findAssociatedTokenAccount(
    owner: PublicKey,
    mint: PublicKey
  ): Promise<PublicKey> {
    const [ata] = PublicKey.findProgramAddressSync(
      [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
    );
    return ata;
  }
}
