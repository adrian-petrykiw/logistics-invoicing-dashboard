import { UseQueryOptions, useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import {
  ConfigTransactionInfo,
  squadsService,
  VaultTransactionInfo,
} from "@/services/squads";

export function useMultisigAllTransactions(
  multisigPda: PublicKey | null,
  options?: Omit<
    UseQueryOptions<(VaultTransactionInfo | ConfigTransactionInfo)[]>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: ["all-transactions", multisigPda?.toBase58()],
    queryFn: async () => {
      if (!multisigPda) return [];
      return squadsService.fetchAllMultisigTransactions(multisigPda);
    },
    enabled: !!multisigPda,
    ...options,
  });
}
