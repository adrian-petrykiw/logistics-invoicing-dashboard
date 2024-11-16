// hooks/useVendorDetails.ts
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { getMultisigPda, getVaultPda } from "@sqds/multisig";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { VendorDetails, ApiResponse } from "@/types/vendor";
import { USDC_MINT } from "@/utils/constants";

// Extended version with blockchain addresses
export interface ExtendedVendorDetails extends VendorDetails {
  vaultAddress: string;
  multisigAddress: string;
  usdcAta: string;
}

export const useVendorDetails = (vendorId: string | null) => {
  const { user } = useAuth();
  const api = useApi(user || null);

  return useQuery<ExtendedVendorDetails | null>({
    queryKey: ["vendor", vendorId],
    queryFn: async () => {
      if (!vendorId) return null;

      const response = await api.get<ApiResponse<VendorDetails>>(
        `/vendors/${vendorId}`
      );

      if (!response.success || !response.data) {
        throw new Error("Failed to fetch vendor details");
      }

      const org = response.data;

      // Derive the vendor's multisig and vault addresses
      const vendorPublicKey = new PublicKey(
        org.business_details.ownerWalletAddress
      );
      const createKey = PublicKey.findProgramAddressSync(
        [Buffer.from("squad"), vendorPublicKey.toBuffer()],
        new PublicKey("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf")
      )[0];

      const [multisigPda] = getMultisigPda({
        createKey: createKey,
      });

      const [vaultPda] = getVaultPda({
        multisigPda,
        index: 0,
      });

      const ata = await getAssociatedTokenAddress(
        USDC_MINT,
        vaultPda,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Return properly structured data matching ExtendedVendorDetails
      return {
        id: org.id,
        business_details: org.business_details,
        vaultAddress: vaultPda.toBase58(),
        multisigAddress: multisigPda.toBase58(),
        usdcAta: ata.toBase58(),
      };
    },
    enabled: !!vendorId && !!user,
  });
};
