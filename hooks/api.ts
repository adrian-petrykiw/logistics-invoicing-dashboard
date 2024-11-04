import axios from "axios";
import { ParticleAuthUser } from "@/types/particle";

export const createApiClient = (userInfo: ParticleAuthUser) => {
  const api = axios.create({
    baseURL: "/api",
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Add auth headers to each request
  api.interceptors.request.use((config) => {
    // Send user info in headers
    config.headers["x-user-email"] = userInfo.email || userInfo.google_email;
    config.headers["x-user-id"] = userInfo.uuid;
    config.headers["x-wallet-address"] = userInfo.walletAddress;

    return config;
  });

  return api;
};
