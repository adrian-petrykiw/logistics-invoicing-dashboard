// // features/auth/hooks/useAuth.ts
// import { useMutation } from '@tanstack/react-query';
// import { squadsService } from '@/services/squads';
// import { useToast } from '@/hooks/useToast';
// import { PublicKey } from '@solana/web3.js';
// import { useWallet } from '@solana/wallet-adapter-react';
// import { generateKeyPair } from 'node:crypto';

// export const useAuth = () => {

//   const { publicKey } = useWallet();
//   const { toast } = useToast();

//   const createMultisig = useMutation({
//     mutationFn: async ({ email }: { email: string }) => {
//       if (!publicKey) throw new Error('Wallet not connected');

//       // Here we'd typically create/get a keypair for the user
//       // For demo, we're using connected wallet as config authority
//       const { signature, multisigPda } = await squadsService.createControlledMultisig({
//         creator: primaryWallet.getWalletClient,
//         email,
//         configAuthority: new PublicKey(publicKey),
//       });

//       return { signature, multisigPda };
//     },
//     onSuccess: () => {
//       toast({
//         title: 'Success',
//         description: 'Multisig wallet created successfully',
//       });
//     },
//     onError: (error) => {
//       toast({
//         title: 'Error',
//         description: error.message,
//         variant: 'destructive',
//       });
//     },
//   });

//   return {
//     createMultisig,
//   };
// };

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@solana/wallet-adapter-react";

export function useAuth() {
  const queryClient = useQueryClient();
  const { publicKey } = useWallet();

  const { data: authState, isLoading } = useQuery({
    queryKey: ["auth"],
    queryFn: async () => {
      // Check if user is logged in with Particle
      const isLoggedIn = window.particle?.auth.isLogin();
      if (!isLoggedIn) return null;

      // Get user info from Particle
      const userInfo = window.particle?.auth.getUserInfo();
      const email = userInfo?.email || userInfo?.google_email;

      if (!email || !publicKey) return null;

      return {
        email,
        walletAddress: publicKey.toString(),
        userInfo,
      };
    },
    // Refetch on window focus to keep auth state fresh
    refetchOnWindowFocus: true,
  });

  const logout = async () => {
    if (window.particle?.auth) {
      await window.particle.auth.logout();
      queryClient.setQueryData(["auth"], null);
    }
  };

  return {
    user: authState,
    isAuthenticated: !!authState,
    isLoading,
    logout,
  };
}
