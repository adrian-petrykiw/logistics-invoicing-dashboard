export interface ParticleUserInfo {
  uuid: string;
  email?: string;
  google_email?: string;
  wallet_address?: string;
}

export interface AuthUser {
  email: string;
  walletAddress: string;
  userInfo: ParticleUserInfo;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}
