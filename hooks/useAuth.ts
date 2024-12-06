// hooks/useAuth.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthUser } from "@/types/auth";
import { api } from "@/utils/api";
import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback } from "react";
import { useParticleStore } from "@/services/particleAuth";

export function useAuth() {
  const queryClient = useQueryClient();
  const { connected, wallet, disconnect, publicKey } = useWallet();
  const { particle } = useParticleStore();

  const {
    data: user,
    isLoading: queryLoading,
    refetch: authRefetch,
  } = useQuery({
    queryKey: ["auth", connected, publicKey?.toString()],
    queryFn: async (): Promise<AuthUser | null> => {
      if (!connected || wallet?.adapter.name !== "Particle" || !particle) {
        return null;
      }

      try {
        const userInfo = particle.auth.userInfo();
        if (!userInfo) return null;

        const email = userInfo.email || userInfo.google_email;
        const walletAddress = publicKey?.toString();

        if (!email || !walletAddress) return null;

        try {
          const response = await api.post<{ invitesActivated: boolean }>(
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
        }

        return {
          email,
          walletAddress,
          userInfo,
          particleUserId: userInfo.uuid,
        };
      } catch (error) {
        console.error("Auth error:", error);
        return null;
      }
    },
    enabled:
      connected && !!wallet && wallet.adapter.name === "Particle" && !!particle,
    retry: (failureCount, error) => {
      console.log("Auth retry attempt:", failureCount, error);
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 30000,
  });

  const logout = useCallback(async () => {
    try {
      if (particle) {
        await particle.auth.logout();
      }
      await disconnect();
      queryClient.setQueryData(["auth"], null);
      queryClient.clear();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [disconnect, queryClient, particle]);

  return {
    user,
    isAuthenticated: !!user && connected,
    isLoading: queryLoading,
    logout,
    refetch: authRefetch,
  };
}
