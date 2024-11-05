import { useMutation } from "@tanstack/react-query";
import { squadsService } from "@/services/squads";
import { PublicKey } from "@solana/web3.js";

export function useSquads() {
  const createMultisig = useMutation({
    mutationFn: async ({
      creator,
      email,
      configAuthority,
    }: {
      creator: PublicKey;
      email: string;
      configAuthority: PublicKey;
    }) => {
      return squadsService.createControlledMultisig({
        creator,
        email,
        configAuthority,
      });
    },
  });

  return {
    createMultisig,
  };
}
