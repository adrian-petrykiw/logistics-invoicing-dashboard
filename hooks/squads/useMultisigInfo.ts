import { UseQueryOptions, useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { MultisigInfo, squadsService } from "@/services/squads";

export function useMultisigInfo(
  multisigPda: PublicKey | null,
  options?: Omit<UseQueryOptions<MultisigInfo | null>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["multisig", multisigPda?.toBase58()],
    queryFn: async () => {
      if (!multisigPda) return null;
      return squadsService.fetchMultisigInfo(multisigPda);
    },
    enabled: !!multisigPda,
    ...options,
  });
}
