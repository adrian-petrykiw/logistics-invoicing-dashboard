import { useCallback } from "react";
import type { AxiosRequestConfig } from "axios";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { api } from "@/lib/api";

export const useApi = () => {
  const { user } = useAuth();

  const request = useCallback(
    async <T>(config: AxiosRequestConfig): Promise<T> => {
      if (!user) {
        throw new Error("Not authenticated");
      }

      const response = await api.request({
        ...config,
        headers: {
          ...config.headers,
          "x-user-email": user.email,
          "x-wallet-address": user.walletAddress,
          "x-user-info": JSON.stringify(user.userInfo),
        },
      });

      return response.data;
    },
    [user]
  );

  return {
    get: <T>(
      url: string,
      config?: Omit<AxiosRequestConfig, "url" | "method">
    ) => request<T>({ ...config, url, method: "GET" }),
    post: <T>(
      url: string,
      data?: any,
      config?: Omit<AxiosRequestConfig, "url" | "method" | "data">
    ) => request<T>({ ...config, url, method: "POST", data }),
    put: <T>(
      url: string,
      data?: any,
      config?: Omit<AxiosRequestConfig, "url" | "method" | "data">
    ) => request<T>({ ...config, url, method: "PUT", data }),
    patch: <T>(
      url: string,
      data?: any,
      config?: Omit<AxiosRequestConfig, "url" | "method" | "data">
    ) => request<T>({ ...config, url, method: "PATCH", data }),
    delete: <T>(
      url: string,
      config?: Omit<AxiosRequestConfig, "url" | "method">
    ) => request<T>({ ...config, url, method: "DELETE" }),
  };
};
