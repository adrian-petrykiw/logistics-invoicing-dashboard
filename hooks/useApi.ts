// hooks/useApi.ts
import { useCallback } from "react";
import type { AxiosRequestConfig } from "axios";
import { api } from "@/utils/api";
import type { AuthUser } from "@/types/auth";

export type ApiUser = {
  email: string;
  walletAddress: string;
  userInfo: any;
} | null;

export const getAuthHeaders = (user: ApiUser) => {
  if (!user) return {};
  const headers = {
    "x-user-email": user.email,
    "x-wallet-address": user.walletAddress,
    "x-user-info": JSON.stringify(user.userInfo),
  };

  console.log("Generated auth headers:", {
    user,
    headers,
  });

  return headers;
};

export const useApi = (user: ApiUser) => {
  const request = useCallback(
    async <T = any>(config: AxiosRequestConfig): Promise<T> => {
      if (!user) {
        console.log("API request attempted without user");
        throw new Error("Not authenticated");
      }

      console.log("Making API request:", {
        config,
        user: {
          email: user.email,
          walletAddress: user.walletAddress,
          hasUserInfo: !!user.userInfo,
        },
      });

      try {
        const response = await api.request({
          ...config,
          headers: {
            ...config.headers,
            ...getAuthHeaders(user),
          },
        });

        console.log("API response:", {
          url: config.url,
          status: response.status,
          data: response.data,
        });

        return response.data;
      } catch (error: any) {
        console.error("API request failed:", {
          url: config.url,
          error: error.response?.data || error.message,
          status: error.response?.status,
        });
        throw error;
      }
    },
    [user]
  );

  const wrappedGet = useCallback(
    <T = any>(
      url: string,
      config?: Omit<AxiosRequestConfig, "url" | "method">
    ) => {
      console.log("GET request initiated:", { url, config });
      return request<T>({ ...config, url, method: "GET" });
    },
    [request]
  );

  const wrappedPost = useCallback(
    <T = any>(
      url: string,
      data?: any,
      config?: Omit<AxiosRequestConfig, "url" | "method" | "data">
    ) => {
      console.log("POST request initiated:", { url, data, config });
      return request<T>({ ...config, url, method: "POST", data });
    },
    [request]
  );

  const wrappedPatch = useCallback(
    <T = any>(
      url: string,
      data?: any,
      config?: Omit<AxiosRequestConfig, "url" | "method" | "data">
    ) => {
      console.log("PATCH request initiated:", { url, data, config });
      return request<T>({ ...config, url, method: "PATCH", data });
    },
    [request]
  );

  const wrappedDelete = useCallback(
    <T = any>(
      url: string,
      config?: Omit<AxiosRequestConfig, "url" | "method">
    ) => {
      console.log("DELETE request initiated:", { url, config });
      return request<T>({ ...config, url, method: "DELETE" });
    },
    [request]
  );

  return {
    get: wrappedGet,
    post: wrappedPost,
    patch: wrappedPatch,
    delete: wrappedDelete,
  };
};
