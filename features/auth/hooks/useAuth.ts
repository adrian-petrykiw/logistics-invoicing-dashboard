// features/auth/hooks/useAuth.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthUser, ParticleUserInfo } from "@/types/auth";
import { api } from "@/lib/api";
import { getAuthHeaders } from "@/hooks/useApi";

export function useAuth() {
  const queryClient = useQueryClient();

  const checkInvites = async (
    email: string,
    walletAddress: string,
    userInfo: ParticleUserInfo
  ) => {
    try {
      const response = await api.post(
        "/auth/check-invites",
        { email, walletAddress },
        {
          headers: getAuthHeaders({
            email,
            walletAddress,
            userInfo,
          }),
        }
      );

      if (response.data.invitesActivated) {
        queryClient.invalidateQueries({ queryKey: ["organizations"] });
      }
    } catch (error) {
      console.error("Failed to check invites:", error);
    }
  };

  const {
    data: user,
    isLoading,
    refetch: authRefetch,
  } = useQuery({
    queryKey: ["auth"],
    queryFn: async (): Promise<AuthUser | null> => {
      if (!window.particle?.auth.isLogin()) return null;

      const userInfo = window.particle.auth.getUserInfo();
      const walletAddress = window.particle.auth.getWallet()?.public_address;
      const email = userInfo?.email || userInfo?.google_email;

      if (!email || !walletAddress) return null;

      await checkInvites(email, walletAddress, userInfo as ParticleUserInfo);

      return {
        email,
        walletAddress,
        userInfo: userInfo as ParticleUserInfo,
      };
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const logout = async () => {
    if (window.particle?.auth) {
      await window.particle.auth.logout();
      queryClient.setQueryData(["auth"], null);
    }
  };

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    logout,
    refetch: authRefetch,
  };
}
