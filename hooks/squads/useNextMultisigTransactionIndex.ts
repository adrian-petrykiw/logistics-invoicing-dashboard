import { useMemo } from "react";
import { PublicKey } from "@solana/web3.js";
import { useMultisigInfo } from "./useMultisigInfo";

export function useNextMultisigTransactionIndex(multisigPda: PublicKey | null) {
  const { data: multisigInfo } = useMultisigInfo(multisigPda);

  return useMemo(() => {
    if (!multisigInfo?.account) return BigInt(1);
    return BigInt(Number(multisigInfo.account.transactionIndex) + 1);
  }, [multisigInfo?.account]);
}
