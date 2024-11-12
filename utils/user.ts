import { ApiUser } from "@/hooks/useApi";
import { AuthUser } from "@/types/auth";

export function getApiUser(user: AuthUser | null | undefined): ApiUser | null {
  if (!user) return null;
  return {
    email: user.email,
    walletAddress: user.walletAddress,
    userInfo: user.userInfo,
  };
}
