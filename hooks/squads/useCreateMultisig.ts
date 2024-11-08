import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import { squadsService } from "@/services/squads";
import { solanaService } from "@/services/solana";
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
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  return useMutation({
    mutationFn: async (input: CreateMultisigInput) => {
      if (!publicKey) throw new Error("Wallet not connected");
      CreateMultisigInputSchema.parse(input);

      const { creator, email, configAuthority } = input;
      const { createIx, multisigPda, createKey } =
        await squadsService.createControlledMultisig({
          creator,
          email,
          configAuthority,
        });

      const createMultisigTx = new Transaction().add(createIx);
      const createSignature = await sendTransaction(
        createMultisigTx,
        connection
      );
      await solanaService.confirmTransactionWithRetry(
        createSignature,
        "confirmed"
      );

      try {
        const response = await fetch("/api/init-fund-multisig", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userWallet: publicKey.toBase58(),
            multisigPda: multisigPda.toBase58(),
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to fund accounts");
        }

        const { signature: fundingSignature } = await response.json();
        console.log("Transaction complete:", {
          multisigCreation: createSignature,
          funding: fundingSignature,
        });
      } catch (fundingError) {
        console.error("Funding error:", fundingError);
        toast.error(
          "Vendor registered but funding failed. Please contact support."
        );
      }

      return { signature: createSignature, multisigPda, createKey };
    },
    onSuccess: () => {
      toast.success("Vendor account created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create multisig: ${error.message}`);
    },
  });
}
