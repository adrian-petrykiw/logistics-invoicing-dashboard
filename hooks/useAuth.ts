// hooks/useAuth.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthUser } from "@/types/auth";
import { api } from "@/utils/api";
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
      // Early return if not connected or not using Particle
      if (!connected || wallet?.adapter.name !== "Particle") {
        return null;
      }

      try {
        // Check if Particle is properly initialized
        if (!window.particle?.auth) {
          console.log("Particle auth not initialized");
          return null;
        }

        // Get user info with proper error handling
        const userInfo = window.particle.auth.getUserInfo();
        if (!userInfo) {
          console.log("No user info found from Particle");
          return null;
        }

        const email = userInfo.email || userInfo.google_email;
        const walletAddress = publicKey?.toString();

        if (!email || !walletAddress) {
          console.log("Missing required user data", { email, walletAddress });
          return null;
        }

        // Check invites with error handling
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
          // Continue auth process even if invite check fails
        }

        // Return authenticated user data
        return {
          email,
          walletAddress,
          userInfo,
        };
      } catch (error) {
        // Log the error but don't throw
        console.error("Auth error:", error);
        if (error instanceof Error) {
          console.error("Error details:", error.message);
        }
        return null;
      }
    },
    enabled: connected && wallet?.adapter.name === "Particle",
    retry: false, // Don't retry on failure
    retryDelay: 1000,
    staleTime: 30000,
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    refetchOnMount: true,
  });

  const logout = useCallback(async () => {
    try {
      await disconnect();
      queryClient.setQueryData(["auth"], null);
      queryClient.removeQueries({ queryKey: ["auth"] });
      // Clear any other related queries
      queryClient.removeQueries({ queryKey: ["organizations"] });
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
