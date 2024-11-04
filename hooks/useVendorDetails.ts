// hooks/useVendorDetails.ts
import { useQuery } from "@tanstack/react-query";
import type { VendorDetails } from "@/types/types";

async function fetchVendorDetails(vendorId: string): Promise<VendorDetails> {
  // This will be replaced with actual API call
  await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay

  // Mock data
  return {
    id: vendorId,
    name: "PayCargo Vendor",
    address: "201 Alhambra Cir Suite 711 Coral Gables, FL 33134",
    phone: "(888) 250-7778",
    customFields: [
      {
        name: "Related BOL/AWB #",
        required: false,
        type: "text",
        key: "relatedBolAwb",
      },
    ],
  };
}

export function useVendorDetails(vendorId: string | null) {
  return useQuery({
    queryKey: ["vendorDetails", vendorId],
    queryFn: () => (vendorId ? fetchVendorDetails(vendorId) : null),
    enabled: !!vendorId,
    staleTime: 5 * 60 * 1000, // data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Unused data in cache for 10 minutes
  });
}
