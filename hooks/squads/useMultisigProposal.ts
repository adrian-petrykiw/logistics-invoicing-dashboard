import { UseQueryOptions, useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import { squadsService } from "@/services/squads";

export function useMultisigProposal(
  multisigPda: PublicKey | null,
  transactionIndex: bigint,
  options?: Omit<
    UseQueryOptions<multisig.accounts.Proposal | null>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: [
      "proposal",
      multisigPda?.toBase58(),
      transactionIndex.toString(),
    ],
    queryFn: async () => {
      if (!multisigPda) return null;
      return squadsService.fetchProposal(multisigPda, transactionIndex);
    },
    enabled: !!multisigPda,
    ...options,
  });
}
