// types/auth.ts
export interface ParticleUserInfo {
  uuid: string;
  email?: string;
  google_email?: string;
  wallet_address?: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthUser {
  email: string;
  walletAddress: string;
  userInfo: ParticleUserInfo;
  particleUserId: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}
