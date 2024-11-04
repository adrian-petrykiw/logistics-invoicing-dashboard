import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthUser, ParticleUserInfo } from "@/types/auth";

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ["auth"],
    queryFn: async (): Promise<AuthUser | null> => {
      if (!window.particle?.auth.isLogin()) return null;

      const userInfo = window.particle.auth.getUserInfo();
      const walletAddress = window.particle.auth.getWallet()?.public_address;
      const email = userInfo?.email || userInfo?.google_email;

      if (!email || !walletAddress) return null;

      return {
        email,
        walletAddress,
        userInfo: userInfo as ParticleUserInfo,
      };
    },
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
  };
}
