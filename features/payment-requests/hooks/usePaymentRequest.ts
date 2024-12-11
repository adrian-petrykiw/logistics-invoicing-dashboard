import { useQuery } from "@tanstack/react-query";
import { api } from "@/utils/api";
import { useAuth } from "@/hooks/useAuth";

export interface PaymentRequestDetails {
  id: string;
  amount: number;
  due_date: string;
  status: string;
  creator_email?: string;
  invoices: Array<{
    number: string;
    amount: number;
    files?: Array<{
      name: string;
      url: string;
    }>;
  }>;
  metadata?: {
    payment_request?: {
      notes?: string;
      creator_email?: string;
      organization_name?: string;
    };
  };
  sender: {
    wallet_address: string;
    multisig_address: string;
    vault_address: string;
    organization?: {
      id: string;
      name: string;
      business_details: {
        companyName: string;
        companyEmail: string;
        companyPhone?: string;
        companyAddress?: string;
      };
    };
  };
  recipient: {
    multisig_address?: string;
    vault_address?: string;
    organization?: {
      id: string;
      name: string;
      business_details: {
        companyName: string;
        companyEmail: string;
        companyPhone?: string;
        companyAddress?: string;
      };
    };
  };
}

export function usePaymentRequest(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["payment-request", id],
    queryFn: async (): Promise<PaymentRequestDetails> => {
      const headers: Record<string, string> = {};
      if (user) {
        headers["x-user-email"] = user.email;
        headers["x-wallet-address"] = user.walletAddress;
        headers["x-user-info"] = JSON.stringify(user.userInfo);
      }

      const { data } = await api.get(`/payment-requests/${id}`, {
        headers,
      });

      if (!data.success) {
        throw new Error(
          data.error?.details || "Failed to fetch payment request"
        );
      }

      return data.data;
    },
    retry: 1,
  });
}
