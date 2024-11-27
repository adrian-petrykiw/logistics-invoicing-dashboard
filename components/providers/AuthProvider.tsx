import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AuthState } from "@/types/auth";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";

const AuthContext = createContext<AuthState | null>(null);

// components/providers/AuthProvider.tsx
export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  // Only show loading on protected routes
  const isProtectedRoute = !["/", "/login"].includes(router.pathname);
  const shouldShowLoading = isProtectedRoute && isLoading;

  console.log("AuthProvider state:", {
    isLoading,
    isProtectedRoute,
    shouldShowLoading,
    pathname: router.pathname,
    hasUser: !!user,
  });

  // Changed the loading condition
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
