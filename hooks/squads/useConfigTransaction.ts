import { UseQueryOptions, useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { ConfigTransactionInfo, squadsService } from "@/services/squads";

export function useConfigTransaction(
  multisigPda: PublicKey | null,
  transactionIndex: bigint,
  options?: Omit<
    UseQueryOptions<ConfigTransactionInfo | null>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: [
      "config-transaction",
      multisigPda?.toBase58(),
      transactionIndex.toString(),
    ],
    queryFn: async () => {
      if (!multisigPda) return null;
      return squadsService.fetchConfigTransaction(
        multisigPda,
        transactionIndex
      );
    },
    enabled: !!multisigPda,
    ...options,
  });
}
