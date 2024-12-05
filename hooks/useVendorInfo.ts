import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { VendorInfo, ApiResponse } from "@/types/vendor";
import { TransactionService } from "@/services/transactionservice";

export const useVendorInfo = (vendorId: string | null) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["vendorInfo", vendorId],
    queryFn: async () => {
      if (!user || !vendorId) {
        throw new Error("Missing user or vendor ID");
      }

      const headers = {
        "x-user-email": user.email,
        "x-wallet-address": user.walletAddress,
        "x-user-info": JSON.stringify(user.userInfo),
      };

      return await TransactionService.fetchVendorDetails(vendorId, headers);
    },
    enabled: !!user && !!vendorId && vendorId !== "new",
  });
};
