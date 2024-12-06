// components/providers/AuthProvider.tsx
import { createContext, useContext, ReactNode, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthState } from "@/types/auth";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { useParticleStore } from "@/services/particleAuth";

const AuthContext = createContext<AuthState | null>(null);

const PROTECTED_ROUTES = ["/dashboard", "/settings", "/transactions"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const { connected } = useWallet();
  const { particle } = useParticleStore();

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    router.pathname.startsWith(route)
  );

  useEffect(() => {
    const handleAuthRedirect = async () => {
      if (!isLoading && isProtectedRoute) {
        if (!connected || !particle || !isAuthenticated) {
          console.log("Unauthorized access attempt:", {
            path: router.pathname,
            connected,
            hasParticle: !!particle,
            isAuthenticated,
          });
          router.push("/");
        }
      }
    };

    handleAuthRedirect();
  }, [
    isLoading,
    isProtectedRoute,
    connected,
    particle,
    isAuthenticated,
    router,
  ]);

  const shouldShowLoading = isProtectedRoute && (isLoading || !particle);

  if (shouldShowLoading) {
    return (
      <div className="bg-primary flex items-center justify-center min-h-screen">
        <div className="text-tertiary">Loading...</div>
      </div>
    );
  }

  const authState: AuthState = {
    user: user
      ? {
          email: user.email,
          walletAddress: user.walletAddress,
          userInfo: user.userInfo,
          particleUserId: user.particleUserId,
        }
      : null,
    isAuthenticated,
    isLoading,
    logout,
  };

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}
