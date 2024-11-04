// services/squads.ts
import * as multisig from "@sqds/multisig";
import {
  Connection,
  Keypair,
  PublicKey,
  Signer,
  Transaction,
} from "@solana/web3.js";
import { ParsedMultisigAccount } from "@/types/types";
const { Permission, Permissions } = multisig.types;

export class SquadsService {
  private connection: Connection;

  constructor(endpoint: string) {
    this.connection = new Connection(endpoint);
  }

  async createControlledMultisig({
    creator,
    email,
    configAuthority,
  }: {
    creator: PublicKey;
    email: string;
    configAuthority: PublicKey;
  }) {
    // Create key from email
    // const createKey = await this.generateCreateKeyFromEmail(email);
    const createKey = Keypair.generate().publicKey;

    // Derive the multisig PDA
    const [multisigPda] = multisig.getMultisigPda({
      createKey: createKey,
    });

    // Get program config for treasury
    const programConfigPda = multisig.getProgramConfigPda({})[0];
    const programConfig =
      await multisig.accounts.ProgramConfig.fromAccountAddress(
        this.connection,
        programConfigPda
      );

    // Create the multisig
    const createIx = await multisig.instructions.multisigCreateV2({
      createKey,
      creator,
      multisigPda,
      configAuthority, // The executive's public key
      threshold: 1, // Single signer required initially
      members: [
        {
          key: creator,
          permissions: Permissions.all(), // Executive gets all permissions
        },
      ],
      timeLock: 0,
      treasury: programConfig.treasury,
      rentCollector: null,
    });

    return {
      createIx,
      multisigPda,
      createKey,
    };
  }

  async addMemberToMultisig({
    multisigPda,
    memberPublicKey,
    configAuthority,
  }: {
    multisigPda: PublicKey;
    memberPublicKey: PublicKey;
    configAuthority: Keypair;
  }) {
    try {
      // First get the current transaction index
      const multisigAccount =
        await multisig.accounts.Multisig.fromAccountAddress(
          this.connection,
          multisigPda
        );

      const currentTransactionIndex = Number(multisigAccount.transactionIndex);
      const newTransactionIndex = BigInt(currentTransactionIndex + 1);

      // Create the config transaction
      const addMemberInstruction =
        await multisig.instructions.configTransactionCreate({
          multisigPda,
          creator: configAuthority.publicKey,
          transactionIndex: newTransactionIndex,
          actions: [
            {
              __kind: "AddMember",
              newMember: {
                key: memberPublicKey,
                permissions: Permissions.all(), // Employees get all permissions except config
              },
            },
          ],
        });

      // Since this is a controlled multisig, we can execute it directly
      const transaction = new Transaction().add(addMemberInstruction);

      // Sign and send the transaction
      const signature = await this.connection.sendTransaction(transaction, [
        configAuthority,
      ]);

      return signature;
    } catch (error) {
      console.error("Error adding member:", error);
      throw error;
    }
  }

  async fetchMultisigsByOwner(
    ownerAddress: PublicKey
  ): Promise<ParsedMultisigAccount[]> {
    // Get all accounts owned by the Squads program
    const accounts = await this.connection.getProgramAccounts(
      new PublicKey(process.env.SQUADS_PROGRAM_ID!),
      {
        filters: [
          {
            memcmp: {
              offset: 8,
              bytes: ownerAddress.toBase58(),
            },
          },
        ],
      }
    );

    // Parse the accounts into Multisig objects with their public keys
    const multisigs = await Promise.all(
      accounts.map(async ({ pubkey, account }) => {
        try {
          const multisigAccount =
            await multisig.accounts.Multisig.fromAccountInfo(account);
          return {
            publicKey: pubkey,
            account: multisigAccount,
          };
        } catch (e) {
          console.error("Failed to parse multisig account:", e);
          return null;
        }
      })
    );

    return multisigs.filter((m): m is ParsedMultisigAccount => m !== null);
  }

  async fetchMultisigTransactions(multisigAddress: PublicKey) {
    try {
      // Get the last 100 signatures for the multisig address
      const signatures = await this.connection.getSignaturesForAddress(
        multisigAddress,
        {
          limit: 100,
        }
      );

      // Fetch the transaction details for each signature
      const transactions = await Promise.all(
        signatures.map(async (sig) => {
          try {
            const tx = await this.connection.getTransaction(sig.signature, {
              maxSupportedTransactionVersion: 0,
            });

            return {
              signature: sig.signature,
              timestamp: sig.blockTime,
              status: sig.err ? "failed" : "success",
              transaction: tx,
            };
          } catch (e) {
            console.error(`Failed to fetch transaction ${sig.signature}:`, e);
            return null;
          }
        })
      );

      return transactions.filter(Boolean);
    } catch (error) {
      console.error("Error fetching multisig transactions:", error);
      throw error;
    }
  }
}

//   private async generateCreateKeyFromEmail(email: string): Promise<Keypair> {
//     const encoder = new TextEncoder();
//     const data = encoder.encode(email);
//     const hash = await crypto.subtle.digest("SHA-256", data);
//     const seed = new Uint8Array(hash);
//     return Keypair.fromSeed(seed);
//   }

export const squadsService = new SquadsService(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL!
);
