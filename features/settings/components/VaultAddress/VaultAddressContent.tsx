import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { PublicKey } from "@solana/web3.js";
import { getVaultPda } from "@sqds/multisig";

interface VaultAddressProps {
  multisigWallet: string;
}

export default function VaultAddressContent({
  multisigWallet,
}: VaultAddressProps) {
  const [vaultAddress, setVaultAddress] = useState<string>("");
  const isBrowser = typeof window !== "undefined";

  useEffect(() => {
    if (!isBrowser) return;

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
}
