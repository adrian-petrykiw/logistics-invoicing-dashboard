import { MOCK_VENDORS } from "@/utils/constants";
import { useQuery } from "@tanstack/react-query";

export interface CustomField {
  name: string;
  required: boolean;
  type: "text" | "number";
  key: string;
}

export interface VendorDetails {
  id: string;
  name: string;
  address: string;
  phone: string;
  type: "shipping" | "airline" | "forwarder" | "warehouse";
  customFields: CustomField[];
}

async function fetchVendorDetails(vendorId: string): Promise<VendorDetails> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const vendor = MOCK_VENDORS[vendorId];
  if (!vendor) {
    throw new Error(`Vendor with ID ${vendorId} not found`);
  }

  return vendor;
}

export function useVendorDetails(vendorId: string | null) {
  return useQuery({
    queryKey: ["vendorDetails", vendorId],
    queryFn: () => (vendorId ? fetchVendorDetails(vendorId) : null),
    enabled: !!vendorId,
    staleTime: 10 * 60 * 1000, // data fresh for 5 minutes
    gcTime: 15 * 60 * 1000, // Unused data in cache for 10 minutes
  });
}

// Export the mock vendors for use in other components
export const mockVendors = Object.entries(MOCK_VENDORS).map(([id, vendor]) => ({
  id,
  name: vendor.name,
}));
