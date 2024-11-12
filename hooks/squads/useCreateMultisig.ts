import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import { CreateMultisigResult } from "@/features/settings/components/RegistrationModal";
import {
  CreateMultisigInput,
  CreateMultisigInputSchema,
} from "@/schemas/squads";

export function useCreateMultisig(): UseMutationResult<
  CreateMultisigResult,
  Error,
  CreateMultisigInput,
  unknown
> {
  const { publicKey } = useWallet();

  return useMutation({
    mutationFn: async (input: CreateMultisigInput) => {
      if (!publicKey) throw new Error("Wallet not connected");
      CreateMultisigInputSchema.parse(input);

      try {
        const response = await fetch("/api/create-multisig", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userWallet: publicKey.toBase58(),
            email: input.email,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create multisig");
        }

        const data = await response.json();
        if (!data.signature || !data.multisigPda || !data.createKey) {
          throw new Error("Invalid response from server");
        }

        return {
          signature: data.signature,
          multisigPda: new PublicKey(data.multisigPda),
          createKey: new PublicKey(data.createKey),
        };
      } catch (error) {
        console.error("Create multisig error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Vendor account created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create multisig: ${error.message}`);
    },
  });
}
