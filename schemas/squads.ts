// types/squads.schema.ts
import { z } from "zod";
import { PublicKey } from "@solana/web3.js";

// Custom validator for PublicKey
const PublicKeySchema = z.instanceof(PublicKey, {
  message: "Must be a valid Solana PublicKey",
});

// Member schema that matches the Squads Member type
export const MultisigMemberSchema = z.object({
  key: PublicKeySchema,
  permissions: z.number(),
});

// Multisig Account schema
export const MultisigAccountSchema = z.object({
  createKey: PublicKeySchema,
  configAuthority: PublicKeySchema,
  threshold: z.number(),
  timeLock: z.number(),
  transactionIndex: z.bigint(),
  staleTransactionIndex: z.bigint(),
  _reserved: z.number(),
  bump: z.number(),
  members: z.array(MultisigMemberSchema),
});

// Base transaction info
const BaseTransactionInfoSchema = z.object({
  publicKey: PublicKeySchema,
  proposalAccount: z.any().optional(), // We'll type this more strictly if needed
});

// Vault Transaction Info schema
export const VaultTransactionInfoSchema = BaseTransactionInfoSchema.extend({
  account: z.object({
    multisig: PublicKeySchema,
    creator: PublicKeySchema,
    index: z.bigint(),
    bump: z.number(),
    vault_index: z.number(),
    vault_bump: z.number(),
    ephemeral_signer_bumps: z.array(z.number()),
    message: z.any(), // Type this more strictly if needed
  }),
});

// Config Transaction Info schema
export const ConfigTransactionInfoSchema = BaseTransactionInfoSchema.extend({
  account: z.object({
    multisig: PublicKeySchema,
    creator: PublicKeySchema,
    index: z.bigint(),
    bump: z.number(),
    actions: z.array(z.any()), // Type this more strictly if needed
  }),
});

// Parsed Multisig Account schema
export const ParsedMultisigAccountSchema = z.object({
  publicKey: PublicKeySchema,
  account: MultisigAccountSchema,
});

export const CreateMultisigInputSchema = z.object({
  creator: PublicKeySchema,
  email: z.string().email(),
  configAuthority: PublicKeySchema,
});

export const CreateMultisigResultSchema = z.object({
  signature: z.string(),
  multisigPda: z.instanceof(PublicKey),
  createKey: z.instanceof(PublicKey),
});

export const AddMultisigMemberInputSchema = z.object({
  multisigPda: PublicKeySchema,
  memberPublicKey: PublicKeySchema,
  configAuthority: PublicKeySchema,
});

export type MultisigMember = z.infer<typeof MultisigMemberSchema>;
export type MultisigAccount = z.infer<typeof MultisigAccountSchema>;
// export type VaultTransactionInfo = z.infer<typeof VaultTransactionInfoSchema>;
// export type ConfigTransactionInfo = z.infer<typeof ConfigTransactionInfoSchema>;
// export type ParsedMultisigAccount = z.infer<typeof ParsedMultisigAccountSchema>;
export type CreateMultisigInput = z.infer<typeof CreateMultisigInputSchema>;
export type AddMultisigMemberInput = z.infer<
  typeof AddMultisigMemberInputSchema
>;
