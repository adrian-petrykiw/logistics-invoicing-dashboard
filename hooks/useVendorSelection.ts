import { useQuery } from "@tanstack/react-query";
import { VendorDetails, ApiResponse, VendorListItem } from "@/types/vendor";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { getApiUser } from "@/utils/user";

export function useVendorSelection(vendorId: string | null) {
  const { user } = useAuth();
  const apiUser = getApiUser(user);
  const api = useApi(apiUser);

  return useQuery<VendorDetails | null, Error>({
    queryKey: ["vendorSelection", vendorId],
    queryFn: async () => {
      if (!vendorId) return null;
      if (vendorId === "new") return null; // Add this line to handle "new" case
      const response = await api.get<ApiResponse<VendorDetails>>(
        `/vendors/${vendorId}`
      );
      if (!response.success) throw new Error(response.error.error);
      return response.data;
    },
    enabled: !!vendorId && !!apiUser && vendorId !== "new", // Modify enabled condition
    // staleTime: 10 * 60 * 1000,
    // gcTime: 15 * 60 * 1000,
  });
}

export function useAvailableVendors() {
  const { user, isLoading: authLoading } = useAuth();
  const apiUser = getApiUser(user);
  const api = useApi(apiUser);

  return useQuery<VendorListItem[], Error>({
    queryKey: ["availableVendors"],
    queryFn: async () => {
      if (!apiUser?.walletAddress) {
        throw new Error("No wallet address available");
      }

      try {
        const response = await api.get<ApiResponse<VendorListItem[]>>(
          "/vendors"
        );

        if (!response.success || !response.data) {
          console.error("Vendor fetch error:", response.error);
          throw new Error(response.error?.error || "Failed to fetch vendors");
        }

        return response.data;
      } catch (error) {
        console.error("Failed to fetch vendors:", error);
        throw error;
      }
    },
    enabled: !authLoading && !!apiUser?.walletAddress && !!apiUser?.email,
    staleTime: 30000, // Add caching for 30 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}
