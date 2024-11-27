import dynamic from "next/dynamic";

const DynamicVaultContent = dynamic(() => import("./VaultAddressContent"), {
  ssr: false,
});

interface VaultAddressProps {
  multisigWallet: string;
}

export const VaultAddress = ({ multisigWallet }: VaultAddressProps) => (
  <DynamicVaultContent multisigWallet={multisigWallet} />
);
