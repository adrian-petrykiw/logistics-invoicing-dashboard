import { useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import { TokenBalanceService } from "@/services/tokenbalance";

const tokenService = new TokenBalanceService();

export function useCreditBalance(multisigPda: PublicKey | null) {
  return useQuery({
    queryKey: ["creditBalance", multisigPda?.toBase58()],
    queryFn: async () => {
      if (!multisigPda) return null;

      // Get the credit vault PDA (using index 0 for credit vault)
      const [creditVaultPda] = multisig.getVaultPda({
        multisigPda,
        index: 0,
      });

      const balance = await tokenService.getTokenBalance(
        creditVaultPda,
        TokenBalanceService.USDC_MINT
      );

      return balance;
    },
    enabled: !!multisigPda,
    retry: 3,
    retryDelay: 1000,
  });
}
