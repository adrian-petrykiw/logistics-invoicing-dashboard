import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  AddMemberInput,
  OrganizationMember,
  UpdateMemberInput,
  Role,
} from "@/schemas/organizationSchemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useOrganizationMembers = (organizationId: string | null) => {
  const api = useApi();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get members with their user details
  const { data: membersWithDetails, isLoading } = useQuery({
    queryKey: ["organization-members", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      return api.get<
        (OrganizationMember & {
          name: string;
          email: string;
        })[]
      >(`/organizations/${organizationId}/members`);
    },
    enabled: !!organizationId,
  });

  const currentUserRole = membersWithDetails?.find(
    (member) => member.email === user?.email
  )?.role;

  const canModifyMembers =
    currentUserRole === "owner" || currentUserRole === "admin";

  const addMember = useMutation({
    mutationFn: async (newMember: AddMemberInput) => {
      return api.post<OrganizationMember>(
        `/organizations/${organizationId}/members`,
        newMember
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
    },
  });

  const updateMember = useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: UpdateMemberInput;
    }) => {
      return api.patch<OrganizationMember>(
        `/organizations/${organizationId}/members/${userId}`,
        updates
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      return api.delete(`/organizations/${organizationId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
    },
  });

  return {
    members: membersWithDetails,
    isLoading,
    addMember,
    updateMember,
    removeMember,
    canModifyMembers,
  };
};
