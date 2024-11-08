import { UseQueryOptions, useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { squadsService } from "@/services/squads";

export function useMultisigTransactions(
  multisigAddress: PublicKey | null,
  options?: UseQueryOptions<any[]>
) {
  return useQuery({
    queryKey: ["multisig-transactions", multisigAddress?.toBase58()],
    queryFn: async () => {
      if (!multisigAddress) return [];
      return squadsService.fetchMultisigTransactions(multisigAddress);
    },
    enabled: !!multisigAddress,
    ...options,
  });
}
