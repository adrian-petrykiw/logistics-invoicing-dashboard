import { SignatureStatus } from "@solana/web3.js";

export function hasError(
  status: SignatureStatus
): status is SignatureStatus & { err: any } {
  return "err" in status && status.err !== null;
}
