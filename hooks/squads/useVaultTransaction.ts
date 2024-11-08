import { UseQueryOptions, useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { squadsService, VaultTransactionInfo } from "@/services/squads";

export function useVaultTransaction(
  multisigPda: PublicKey | null,
  transactionIndex: bigint,
  options?: Omit<
    UseQueryOptions<VaultTransactionInfo | null>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: [
      "vault-transaction",
      multisigPda?.toBase58(),
      transactionIndex.toString(),
    ],
    queryFn: async () => {
      if (!multisigPda) return null;
      return squadsService.fetchVaultTransaction(multisigPda, transactionIndex);
    },
    enabled: !!multisigPda,
    ...options,
  });
}
