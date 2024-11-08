import { UseQueryOptions, useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { squadsService } from "@/services/squads";

export function useVaultAccount(
  multisigPda: PublicKey | null,
  vaultIndex: number,
  options?: Omit<UseQueryOptions<PublicKey | null>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: ["vault", multisigPda?.toBase58(), vaultIndex],
    queryFn: async () => {
      if (!multisigPda) return null;
      return squadsService.fetchVaultAccount(multisigPda, vaultIndex);
    },
    enabled: !!multisigPda,
    ...options,
  });
}
