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
