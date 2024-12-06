// services/particleAuth.ts
import { ParticleNetwork } from "@particle-network/auth";
import { create } from "zustand";

interface ParticleState {
  particle: ParticleNetwork | null;
  initialize: () => void;
}

// Initialize Particle with environment variables
export const createParticleInstance = () => {
  return new ParticleNetwork({
    projectId: process.env.NEXT_PUBLIC_PARTICLE_PROJECT_ID!,
    clientKey: process.env.NEXT_PUBLIC_PARTICLE_CLIENT_KEY!,
    appId: process.env.NEXT_PUBLIC_PARTICLE_APP_ID!,
    chainName: "solana",
    chainId: 101,
  });
};

export const useParticleStore = create<ParticleState>((set) => ({
  particle: null,
  initialize: () => {
    if (typeof window === "undefined") return;
    const particle = createParticleInstance();
    set({ particle });
  },
}));
