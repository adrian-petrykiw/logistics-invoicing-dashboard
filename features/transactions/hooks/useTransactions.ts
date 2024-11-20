// hooks/useTransactions.ts
import { useQuery } from "@tanstack/react-query";
import { TransactionRecord } from "@/types/transaction";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/features/auth/hooks/useOrganization";

interface TransactionResponse {
  success: boolean;
  data: TransactionRecord[];
  error?: {
    error: string;
    code: string;
    details?: string;
  };
}

export const useTransactions = () => {
  const { user } = useAuth();
  const { organization } = useOrganization(user?.walletAddress || "");

  const {
    data: transactions,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["transactions", organization?.id],
    queryFn: async (): Promise<TransactionRecord[]> => {
      if (!organization?.id) {
        throw new Error("No organization ID available");
      }

      const response = await fetch(
        `/api/transactions?organization_id=${organization.id}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result: TransactionResponse = await response.json();

      if (!result.success) {
        throw new Error(
          result.error?.details || "Failed to fetch transactions"
        );
      }

      return result.data;
    },
    enabled: !!organization?.id,
  });

  return {
    transactions: transactions || [],
    isLoading,
    error,
    refetch,
    isRefetching,
  };
};
