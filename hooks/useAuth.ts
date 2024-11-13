// hooks/useAuth.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthUser } from "@/types/auth";
import { api } from "@/lib/api";
import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback } from "react";

export function useAuth() {
  const queryClient = useQueryClient();
  const { connected, wallet, disconnect, publicKey } = useWallet();

  const {
    data: user,
    isLoading: queryLoading,
    refetch: authRefetch,
  } = useQuery({
    queryKey: ["auth", connected, publicKey?.toString()],
    queryFn: async (): Promise<AuthUser | null> => {
      if (!connected || wallet?.adapter.name !== "Particle") {
        return null;
      }

      try {
        // Using window.particle directly as it's already initialized
        const userInfo = window.particle?.auth?.getUserInfo();
        if (!userInfo) return null;

        const email = userInfo.email || userInfo.google_email;
        const walletAddress = publicKey?.toString();

        if (!email || !walletAddress) return null;

        // Check invites
        try {
          const response = await api.post(
            "auth/check-invites",
            {
              email,
              walletAddress,
            },
            {
              headers: {
                "x-user-email": email,
                "x-wallet-address": walletAddress,
                "x-user-info": JSON.stringify(userInfo),
              },
            }
          );

          if (response.data.invitesActivated) {
            queryClient.invalidateQueries({ queryKey: ["organizations"] });
          }
        } catch (error) {
          console.error("Failed to check invites:", error);
          // Don't fail auth if invites check fails
        }

        return {
          email,
          walletAddress,
          userInfo,
        };
      } catch (error) {
        console.error("Auth error:", error);
        return null;
      }
    },
    enabled: connected && !!wallet && wallet.adapter.name === "Particle",
    retry: 3,
    retryDelay: 1000,
    staleTime: 30000,
  });

  const logout = useCallback(async () => {
    try {
      await disconnect();
      queryClient.setQueryData(["auth"], null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [disconnect, queryClient]);

  return {
    user,
    isAuthenticated: !!user && connected,
    isLoading: queryLoading,
    logout,
    refetch: authRefetch,
  };
}
