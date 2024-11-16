import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  CreateOrganizationInput,
  OrganizationResponse,
  ApiResponse,
} from "@/schemas/organization";
import { useAuth } from "@/hooks/useAuth";

export const useOrganization = (userId: string) => {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["organizations", userId],
    queryFn: async () => {
      console.log("Fetching organizations for user:", userId);
      const response = await api.get<ApiResponse<OrganizationResponse[]>>(
        "/organizations",
        {
          headers: user
            ? {
                "x-user-email": user.email,
                "x-wallet-address": user.walletAddress,
                "x-user-info": JSON.stringify(user.userInfo),
              }
            : {},
        }
      );
      return response.data;
    },
    enabled: !!userId && !!user && !authLoading,
  });

  const createOrganization = useMutation({
    mutationFn: async (newOrg: CreateOrganizationInput) => {
      if (!user) throw new Error("User must be authenticated");
      const response = await api.post<ApiResponse<OrganizationResponse>>(
        "/organizations",
        newOrg,
        {
          headers: {
            "x-user-email": user.email,
            "x-wallet-address": user.walletAddress,
            "x-user-info": JSON.stringify(user.userInfo),
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });

  return {
    organization: response?.success ? response.data?.[0] : undefined,
    organizations: response?.success ? response.data : [],
    isLoading: isLoading || authLoading,
    error,
    createOrganization,
  };
};
