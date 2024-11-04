import { api } from "@/hooks/api";
import type { OrganizationMember, AddMemberInput } from "@/types/orgSchemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useOrganizationMembers = (organizationId: string | null) => {
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ["organization-members", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await api.get<OrganizationMember[]>(
        `/organizations/${organizationId}/members`
      );
      return data;
    },
    enabled: !!organizationId,
  });

  const addMember = useMutation({
    mutationFn: async (newMember: AddMemberInput) => {
      const { data } = await api.post<OrganizationMember>(
        `/organizations/${organizationId}/members`,
        newMember
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
    },
  });

  return {
    members,
    isLoading,
    addMember,
  };
};
