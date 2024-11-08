import { z } from "zod";
import { PublicKey } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";

const PublicKeySchema = z.instanceof(PublicKey);

// Create types that match the SDK
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

export interface ParsedMultisigAccount {
  publicKey: PublicKey;
  account: multisig.accounts.Multisig;
}

export interface MultisigInfo {
  publicKey: PublicKey;
  account: multisig.accounts.Multisig;
  vaults?: PublicKey[];
}
