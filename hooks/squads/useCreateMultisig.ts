import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import { squadsService } from "@/services/squads";
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

      const transaction = new Transaction().add(createIx);
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature);

      return { signature, multisigPda, createKey };
    },
    onSuccess: () => {
      toast.success("Multisig created successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create multisig: ${error.message}`);
    },
  });
}
