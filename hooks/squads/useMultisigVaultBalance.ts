import { useQuery } from "@tanstack/react-query";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import { TokenBalanceService } from "@/services/tokenbalance";

export function useMultisigVaultBalance(multisigPda: PublicKey | null) {
  const { connection } = useConnection();

  return useQuery({
    queryKey: ["multisigBalance", multisigPda?.toBase58()],
    queryFn: async () => {
      if (!multisigPda) return null;

      // Get the vault PDA (using index 0 as default vault)
      const [vaultPda] = multisig.getVaultPda({
        multisigPda,
        index: 0,
      });

      const tokenService = new TokenBalanceService(connection);
      const balance = await tokenService.getTokenBalance(
        vaultPda,
        TokenBalanceService.USDC_MINT
      );

      return balance;
    },
    enabled: !!multisigPda,
  });
}
