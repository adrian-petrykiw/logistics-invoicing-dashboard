import { useMemo } from "react";
import { PublicKey } from "@solana/web3.js";
import { useMultisigInfo } from "./useMultisigInfo";

export function useIsMultisigMember(
  multisigPda: PublicKey | null,
  memberAddress: PublicKey | null
) {
  const { data: multisigInfo } = useMultisigInfo(multisigPda);

  return useMemo(() => {
    if (!multisigInfo?.account || !memberAddress) return false;
    return multisigInfo.account.members.some((member) =>
      member.key.equals(memberAddress)
    );
  }, [multisigInfo?.account, memberAddress]);
}
