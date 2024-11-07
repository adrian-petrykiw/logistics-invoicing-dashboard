import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  AddMemberInput,
  OrganizationMemberResponse,
  UpdateMemberParams,
  ApiResponse,
} from "@/schemas/organizationSchemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useOrganizationMembers = (organizationId: string | null) => {
  const { user, isLoading: authLoading } = useAuth();
  const api = useApi(user || null);
  const queryClient = useQueryClient();

  const { data: response, isLoading } = useQuery({
    queryKey: ["organization-members", organizationId],
    queryFn: async () => {
      if (!organizationId) return { success: true, data: [] };
      console.log("Fetching members for organization:", organizationId);
      const response = await api.get<ApiResponse<OrganizationMemberResponse[]>>(
        `/organizations/${organizationId}/members`
      );
      console.log("Members response:", response);
      return response;
    },
    enabled: !!organizationId && !!user && !authLoading,
  });

  const members = response?.success ? response.data : [];

  const currentUserRole = members?.find(
    (member) => member.email === user?.email
  )?.role;

  const canModifyMembers =
    currentUserRole === "owner" || currentUserRole === "admin";

  const addMember = useMutation({
    mutationFn: async (newMember: AddMemberInput) => {
      console.log("Adding new member:", newMember);
      const response = await api.post<ApiResponse<OrganizationMemberResponse>>(
        `/organizations/${organizationId}/members`,
        newMember
      );
      console.log("Add member response:", response);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
    },
    onError: (error) => {
      console.error("Add member error:", error);
      throw error;
    },
  });

  const updateMember = useMutation({
    mutationFn: async ({ userId, updates }: UpdateMemberParams) => {
      if (!userId || !organizationId) {
        throw new Error("Invalid member or organization ID");
      }

      console.log("Updating member:", { userId, updates });
      const response = await api.patch<ApiResponse<OrganizationMemberResponse>>(
        `/organizations/${organizationId}/members/${userId}`,
        updates
      );
      console.log("Update member response:", response);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
    },
    onError: (error) => {
      console.error("Update member error:", error);
      throw error;
    },
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      if (!organizationId) {
        throw new Error("Invalid organization ID");
      }

      console.log("Removing member:", userId);
      const response = await api.delete<ApiResponse<void>>(
        `/organizations/${organizationId}/members/${userId}`
      );
      console.log("Remove member response:", response);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization-members"] });
    },
    onError: (error) => {
      console.error("Remove member error:", error);
      throw error;
    },
  });

  return {
    members,
    isLoading: isLoading || authLoading,
    addMember,
    updateMember,
    removeMember,
    canModifyMembers,
  };
};
