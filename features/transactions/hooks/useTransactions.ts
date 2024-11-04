import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";
import { squadsService } from "@/services/squads";

export const useTransactions = () => {
  const { publicKey, connected } = useWallet();

  const {
    data: transactions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["transactions", publicKey?.toBase58()],
    queryFn: async () => {
      try {
        if (!publicKey) throw new Error("No public key");
        return await squadsService.fetchMultisigTransactions(publicKey);
      } catch (err) {
        console.error("Error fetching transactions:", err);
        return [];
      }
    },
    enabled: !!publicKey && connected,
  });

  return {
    transactions: transactions || [],
    isLoading,
    error,
  };
};
