export interface ParticleUserInfo {
  uuid: string;
  email?: string;
  google_email?: string;
  wallet_address?: string;
}

export interface AuthState {
  user: {
    email: string;
    walletAddress: string;
    userInfo: ParticleUserInfo;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}
