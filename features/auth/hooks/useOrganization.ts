// hooks/useOrganization.ts
import { useApi } from "@/hooks/useApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import {
  CreateOrganizationInput,
  OrganizationResponse,
  ApiResponse,
} from "@/schemas/organization";

export const useOrganization = (userId: string) => {
  const { user, isLoading: authLoading } = useAuth();
  const api = useApi(user || null);
  const queryClient = useQueryClient();

  const { data: response, isLoading } = useQuery({
    queryKey: ["organizations", userId],
    queryFn: async () => {
      console.log("Fetching organizations for user:", userId);
      const response = await api.get<ApiResponse<OrganizationResponse[]>>(
        "/organizations"
      );
      console.log("Organizations response:", response);
      return response;
    },
    enabled: !!userId && !!user && !authLoading,
  });

  // Extract organizations from the API response
  const organizations = response?.success ? response.data : [];

  const createOrganization = useMutation({
    mutationFn: async (newOrg: CreateOrganizationInput) => {
      if (!user) throw new Error("User must be authenticated");
      console.log("Creating organization:", newOrg);
      const response = await api.post<ApiResponse<OrganizationResponse>>(
        "/organizations",
        newOrg
      );
      console.log("Creation response:", response);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
    onError: (error) => {
      console.error("Organization creation error:", error);
      throw error;
    },
  });

  return {
    organization: organizations?.[0],
    organizations,
    isLoading: isLoading || authLoading,
    createOrganization,
  };
};
