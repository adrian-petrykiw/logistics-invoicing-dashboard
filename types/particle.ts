// types/particle.ts
import { WalletAdapter } from "@solana/wallet-adapter-base";

export interface ParticleAuthUser {
  uuid: string;
  email?: string;
  google_email?: string;
  phone?: string;
  name?: string;
  walletAddress?: string;
}

export interface ParticleAuth {
  getUserInfo: () => ParticleAuthUser | null;
  isLogin: () => boolean;
  logout: () => Promise<void>;
}

export interface ParticleNetwork {
  auth: ParticleAuth;
}

export interface ParticleWalletAdapter extends WalletAdapter {
  particle?: ParticleNetwork;
}
