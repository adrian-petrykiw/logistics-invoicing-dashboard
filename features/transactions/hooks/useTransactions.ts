import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { TransactionRecord } from "@/types/transaction";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/features/auth/hooks/useOrganization";
import { api } from "@/utils/api";
import { AuthUser } from "@/types/auth";

export const useTransactions = () => {
  const { user, isAuthenticated } = useAuth();
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
      if (!organization?.id || !user) {
        throw new Error("Required auth information not available");
      }

      const { data } = await api.get<{
        success: boolean;
        data: TransactionRecord[];
        error?: any;
      }>(`/transactions`, {
        params: { organization_id: organization.id },
        headers: {
          "x-user-email": user.email,
          "x-wallet-address": user.walletAddress,
          "x-user-info": JSON.stringify(user.userInfo),
        },
      });

      if (!data.success) {
        throw new Error(data.error?.details || "Failed to fetch transactions");
      }

      return data.data;
    },
    enabled: !!(isAuthenticated && organization?.id && user),
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          return false;
        }
      }
      return failureCount < 3;
    },
    refetchOnWindowFocus: true,
    staleTime: 30000,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    transactions: transactions || [],
    isLoading,
    error,
    refetch,
    isRefetching,
  };
};
