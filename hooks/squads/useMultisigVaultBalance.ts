import { useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import { TokenBalanceService } from "@/services/tokenbalance";

// Create a singleton instance of TokenBalanceService
const tokenService = new TokenBalanceService();

export function useMultisigVaultBalance(multisigPda: PublicKey | null) {
  return useQuery({
    queryKey: ["multisigBalance", multisigPda?.toBase58()],
    queryFn: async () => {
      if (!multisigPda) return null;

      // Get the vault PDA (using index 0 as default vault)
      const [vaultPda] = multisig.getVaultPda({
        multisigPda,
        index: 0,
      });

      const balance = await tokenService.getTokenBalance(
        vaultPda,
        TokenBalanceService.USDC_MINT
      );

      return balance;
    },
    enabled: !!multisigPda,
    retry: 3,
    retryDelay: 1000,
  });
}
