// hooks/useApi.ts
import { useCallback } from "react";
import type { AxiosRequestConfig } from "axios";
import { api } from "@/lib/api";
import type { AuthUser } from "@/types/auth";

type ApiUser = {
  email: string;
  walletAddress: string;
  userInfo: any;
} | null;

export const getAuthHeaders = (user: ApiUser) => {
  if (!user) return {};
  return {
    "x-user-email": user.email,
    "x-wallet-address": user.walletAddress,
    "x-user-info": JSON.stringify(user.userInfo),
  };
};

export const useApi = (user: ApiUser) => {
  const request = useCallback(
    async <T = any>(config: AxiosRequestConfig): Promise<T> => {
      if (!user) {
        throw new Error("Not authenticated");
      }

      const response = await api.request({
        ...config,
        headers: {
          ...config.headers,
          ...getAuthHeaders(user),
        },
      });

      return response.data;
    },
    [user]
  );

  return {
    get: <T = any>(
      url: string,
      config?: Omit<AxiosRequestConfig, "url" | "method">
    ) => request<T>({ ...config, url, method: "GET" }),
    post: <T = any>(
      url: string,
      data?: any,
      config?: Omit<AxiosRequestConfig, "url" | "method" | "data">
    ) => request<T>({ ...config, url, method: "POST", data }),
    patch: <T = any>(
      url: string,
      data?: any,
      config?: Omit<AxiosRequestConfig, "url" | "method" | "data">
    ) => request<T>({ ...config, url, method: "PATCH", data }),
    delete: <T = any>(
      url: string,
      config?: Omit<AxiosRequestConfig, "url" | "method">
    ) => request<T>({ ...config, url, method: "DELETE" }),
  };
};
