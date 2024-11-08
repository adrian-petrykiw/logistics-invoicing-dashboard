import { UseQueryOptions, useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { squadsService } from "@/services/squads";
import { ParsedMultisigAccount } from "@/types/squads";

export function useMultisigsByOwner(
  ownerAddress: PublicKey | null,
  options?: Omit<
    UseQueryOptions<ParsedMultisigAccount[]>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: ["multisigs", ownerAddress?.toBase58()],
    queryFn: async () => {
      if (!ownerAddress) return [];
      return squadsService.fetchMultisigsByOwner(ownerAddress);
    },
    enabled: !!ownerAddress,
    ...options,
  });
}
