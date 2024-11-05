import { useApi } from "@/hooks/useApi";
import {
  CreateOrganizationInput,
  Organization,
} from "@/schemas/organizationSchemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export const useOrganization = (userId: string) => {
  const api = useApi();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: organizations, isLoading } = useQuery({
    queryKey: ["organizations", userId],
    queryFn: async () => {
      return api.get<Organization[]>("/organizations/me");
    },
    enabled: !!userId,
  });

  const createOrganization = useMutation({
    mutationFn: async (newOrg: CreateOrganizationInput) => {
      return api.post<Organization>("/organizations", newOrg);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
  });

  return {
    organization: organizations?.[0],
    organizations,
    isLoading,
    createOrganization,
  };
};
