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

export interface VaultTransactionInfo {
  publicKey: PublicKey;
  account: multisig.accounts.VaultTransaction;
  proposalAccount?: multisig.accounts.Proposal;
}

export interface ConfigTransactionInfo {
  publicKey: PublicKey;
  account: multisig.accounts.ConfigTransaction;
  proposalAccount?: multisig.accounts.Proposal;
}

export interface MultisigInfo {
  publicKey: PublicKey;
  account: multisig.accounts.Multisig;
  vaults?: PublicKey[];
}

export class SquadsService {
  private connection: Connection;

  constructor(endpoint: string) {
    this.connection = new Connection(endpoint);
  }

  // Fetch a specific multisig account and its associated vaults
  async fetchMultisigInfo(
    multisigPda: PublicKey
  ): Promise<MultisigInfo | null> {
    try {
      const multisigAccount =
        await multisig.accounts.Multisig.fromAccountAddress(
          this.connection,
          multisigPda
        );

      // Get all vault PDAs (we'll fetch first 5 vaults by default)
      const vaults = await Promise.all(
        Array.from({ length: 5 }).map((_, i) => {
          const [vaultPda] = multisig.getVaultPda({
            multisigPda,
            index: i,
          });
          return vaultPda;
        })
      );

      return {
        publicKey: multisigPda,
        account: multisigAccount,
        vaults,
      };
    } catch (error) {
      console.error("Error fetching multisig info:", error);
      return null;
    }
  }

  // Fetch a specific vault account
  async fetchVaultAccount(
    multisigPda: PublicKey,
    vaultIndex: number
  ): Promise<PublicKey> {
    const [vaultPda] = multisig.getVaultPda({
      multisigPda,
      index: vaultIndex,
    });
    return vaultPda;
  }

  // Fetch a specific vault transaction and its proposal
  async fetchVaultTransaction(
    multisigPda: PublicKey,
    transactionIndex: bigint
  ): Promise<VaultTransactionInfo | null> {
    try {
      const [transactionPda] = multisig.getTransactionPda({
        multisigPda,
        index: transactionIndex,
      });

      const transactionAccount =
        await multisig.accounts.VaultTransaction.fromAccountAddress(
          this.connection,
          transactionPda
        );

      // Get the proposal account if it exists
      const [proposalPda] = multisig.getProposalPda({
        multisigPda,
        transactionIndex,
      });

      let proposalAccount;
      try {
        proposalAccount = await multisig.accounts.Proposal.fromAccountAddress(
          this.connection,
          proposalPda
        );
      } catch (e) {
        // Proposal might not exist yet
        console.log("No proposal account found for transaction");
      }

      return {
        publicKey: transactionPda,
        account: transactionAccount,
        proposalAccount,
      };
    } catch (error) {
      console.error("Error fetching vault transaction:", error);
      return null;
    }
  }

  // Fetch a specific config transaction and its proposal
  async fetchConfigTransaction(
    multisigPda: PublicKey,
    transactionIndex: bigint
  ): Promise<ConfigTransactionInfo | null> {
    try {
      const [transactionPda] = multisig.getTransactionPda({
        multisigPda,
        index: transactionIndex,
      });

      const transactionAccount =
        await multisig.accounts.ConfigTransaction.fromAccountAddress(
          this.connection,
          transactionPda
        );

      // Get the proposal account if it exists
      const [proposalPda] = multisig.getProposalPda({
        multisigPda,
        transactionIndex,
      });

      let proposalAccount;
      try {
        proposalAccount = await multisig.accounts.Proposal.fromAccountAddress(
          this.connection,
          proposalPda
        );
      } catch (e) {
        // Proposal might not exist yet
        console.log("No proposal account found for transaction");
      }

      return {
        publicKey: transactionPda,
        account: transactionAccount,
        proposalAccount,
      };
    } catch (error) {
      console.error("Error fetching config transaction:", error);
      return null;
    }
  }

  // Fetch all transactions (both vault and config) for a multisig
  async fetchAllMultisigTransactions(
    multisigPda: PublicKey
  ): Promise<(VaultTransactionInfo | ConfigTransactionInfo)[]> {
    try {
      // First get the multisig account to know how many transactions exist
      const multisigAccount =
        await multisig.accounts.Multisig.fromAccountAddress(
          this.connection,
          multisigPda
        );

      const currentTransactionIndex = Number(multisigAccount.transactionIndex);

      // Fetch all transactions
      const transactions = await Promise.all(
        Array.from({ length: currentTransactionIndex }).map(async (_, i) => {
          const index = BigInt(i + 1);
          const [transactionPda] = multisig.getTransactionPda({
            multisigPda,
            index,
          });

          try {
            // Try to fetch as vault transaction first
            const vaultTx = await this.fetchVaultTransaction(
              multisigPda,
              index
            );
            if (vaultTx) return vaultTx;

            // If not a vault transaction, try as config transaction
            const configTx = await this.fetchConfigTransaction(
              multisigPda,
              index
            );
            if (configTx) return configTx;

            return null;
          } catch (e) {
            console.error(`Error fetching transaction ${index}:`, e);
            return null;
          }
        })
      );

      return transactions.filter(
        (tx): tx is VaultTransactionInfo | ConfigTransactionInfo => tx !== null
      );
    } catch (error) {
      console.error("Error fetching all transactions:", error);
      return [];
    }
  }

  // Fetch a specific proposal
  async fetchProposal(
    multisigPda: PublicKey,
    transactionIndex: bigint
  ): Promise<multisig.accounts.Proposal | null> {
    try {
      const [proposalPda] = multisig.getProposalPda({
        multisigPda,
        transactionIndex,
      });

      const proposalAccount =
        await multisig.accounts.Proposal.fromAccountAddress(
          this.connection,
          proposalPda
        );

      return proposalAccount;
    } catch (error) {
      console.error("Error fetching proposal:", error);
      return null;
    }
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
    const createKey = Keypair.generate().publicKey;
    const [multisigPda] = multisig.getMultisigPda({
      createKey: createKey,
    });

    const programConfigPda = multisig.getProgramConfigPda({})[0];
    const programConfig =
      await multisig.accounts.ProgramConfig.fromAccountAddress(
        this.connection,
        programConfigPda
      );

    const createIx = await multisig.instructions.multisigCreateV2({
      createKey,
      creator,
      multisigPda,
      configAuthority,
      threshold: 1,
      members: [
        {
          key: creator,
          permissions: Permissions.all(),
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

  async createMultisig({
    creator,
    email,
  }: {
    creator: PublicKey;
    email: string;
  }) {
    const createKey = Keypair.generate().publicKey;

    const [multisigPda] = multisig.getMultisigPda({
      createKey: createKey,
    });

    const programConfigPda = multisig.getProgramConfigPda({})[0];
    const programConfig =
      await multisig.accounts.ProgramConfig.fromAccountAddress(
        this.connection,
        programConfigPda
      );

    const createIx = await multisig.instructions.multisigCreateV2({
      createKey,
      creator,
      multisigPda,
      configAuthority: null,
      threshold: 1,
      members: [
        {
          key: creator,
          permissions: Permissions.all(),
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
      const multisigAccount =
        await multisig.accounts.Multisig.fromAccountAddress(
          this.connection,
          multisigPda
        );

      const currentTransactionIndex = Number(multisigAccount.transactionIndex);
      const newTransactionIndex = BigInt(currentTransactionIndex + 1);

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
                permissions: Permissions.all(),
              },
            },
          ],
        });

      const transaction = new Transaction().add(addMemberInstruction);
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
      const signatures = await this.connection.getSignaturesForAddress(
        multisigAddress,
        {
          limit: 100,
        }
      );

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

export const squadsService = new SquadsService(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL!
);
