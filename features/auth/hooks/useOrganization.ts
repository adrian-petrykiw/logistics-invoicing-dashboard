import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/api";
import { CreateOrganizationInput, Organization } from "@/schemas/orgSchemas";

export const useOrganization = (userId: string) => {
  const queryClient = useQueryClient();

  const { data: organization, isLoading } = useQuery({
    queryKey: ["organization", userId],
    queryFn: async () => {
      const { data } = await api.get<Organization>("/organizations");
      return data;
    },
  });

  const createOrganization = useMutation({
    mutationFn: async (newOrg: CreateOrganizationInput) => {
      const { data } = await api.post<Organization>("/organizations", newOrg);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
    },
  });

  return {
    organization,
    isLoading,
    createOrganization,
  };
};
