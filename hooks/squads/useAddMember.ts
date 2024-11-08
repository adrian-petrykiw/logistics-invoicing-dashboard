import { useMutation } from "@tanstack/react-query";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import {
  AddMultisigMemberInput,
  AddMultisigMemberInputSchema,
} from "@/schemas/squads";
import { squadsService } from "@/services/squads";

export function useAddMember() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  return useMutation({
    mutationFn: async (input: AddMultisigMemberInput) => {
      if (!publicKey) throw new Error("Wallet not connected");
      AddMultisigMemberInputSchema.parse(input);

      const { multisigPda, memberPublicKey, configAuthority } = input;
      return await squadsService.addMemberToMultisig({
        multisigPda,
        memberPublicKey,
        configAuthority: configAuthority as any,
      });
    },
    onSuccess: () => {
      toast.success("Member added successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add member: ${error.message}`);
    },
  });
}
