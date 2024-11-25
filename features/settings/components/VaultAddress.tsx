import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { PublicKey } from "@solana/web3.js";
import { getVaultPda } from "@sqds/multisig";

interface VaultAddressProps {
  multisigWallet: string;
}

export const VaultAddress = ({ multisigWallet }: VaultAddressProps) => {
  const [vaultAddress, setVaultAddress] = useState<string>("");
  const isBrowser = typeof window !== "undefined";

  useEffect(() => {
    if (!isBrowser) return; // Skip in SSR

    if (multisigWallet) {
      try {
        const multisigPda = new PublicKey(multisigWallet);
        const [vaultPda] = getVaultPda({
          multisigPda,
          index: 0,
        });
        setVaultAddress(vaultPda.toBase58());
      } catch (error) {
        console.error("Error calculating vault address:", error);
        setVaultAddress("Error calculating address");
      }
    }
  }, [multisigWallet, isBrowser]);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Vault/Treasury Address</p>
      <Input
        value={vaultAddress}
        disabled
        type="text"
        className="text-xs"
        placeholder={!isBrowser ? "Loading..." : ""}
      />
    </div>
  );
};

// Optional: Create an index.ts file in the settings folder for cleaner imports
// components/settings/index.ts
export * from "./EditMemberModal";
export * from "./VaultAddress";
