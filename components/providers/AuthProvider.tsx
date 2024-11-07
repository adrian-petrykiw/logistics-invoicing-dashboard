import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AuthState } from "@/types/auth";

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  if (isLoading) {
    <div className="bg-primary flex items-center justify-center">
      Loading...
    </div>;
  }

  // Create a properly typed auth state object
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
