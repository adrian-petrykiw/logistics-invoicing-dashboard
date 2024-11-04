import { PublicKey } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";

type MultisigAccount = ReturnType<
  typeof multisig.accounts.Multisig.fromAccountInfo
> extends Promise<infer T>
  ? T
  : never;

export interface ParsedMultisigAccount {
  publicKey: PublicKey;
  account: MultisigAccount;
}
export interface CustomField {
  name: string;
  required: boolean;
  type: "text" | "number" | "date";
  key: string;
}

export interface VendorDetails {
  id: string;
  name: string;
  address: string;
  phone: string;
  customFields: CustomField[];
}
