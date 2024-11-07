// pages/api/organizations/[id]/members.ts
import { NextApiResponse } from "next";
import { z } from "zod";
import {
  ApiResponse,
  OrganizationMemberResponse,
  OrganizationMemberResponseSchema,
  RoleSchema,
  StatusSchema,
} from "@/schemas/organizationSchemas";
import { withAuth, AuthedRequest } from "@/pages/api/_lib/auth";
import { supabaseAdmin } from "../../_lib/supabase";

const RawMemberSchema = z.object({
  user_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  role: RoleSchema,
  status: StatusSchema,
  email: z.string().email().nullable(),
  name: z.string().nullable(),
  wallet_address: z.string().nullable(),
  created_at: z.string(),
  invited_by: z.string().uuid().nullable(),
  invited_at: z.string().nullable(),
  user: z
    .object({
      id: z.string().uuid(),
      email: z.string().email(),
      name: z.string().nullable(),
      wallet_address: z.string(),
    })
    .nullable(),
  inviter: z
    .object({
      id: z.string().uuid(),
      email: z.string().email(),
      name: z.string().nullable(),
    })
    .nullable(),
});

async function handler(
  req: AuthedRequest,
  res: NextApiResponse<ApiResponse<OrganizationMemberResponse[]>>
) {
  const { id } = req.query;

  try {
    const { data: rawMembers, error: membersError } = await supabaseAdmin
      .from("organization_members")
      .select(
        `
        *,
        user:users!organization_members_user_id_fkey (
          id,
          email,
          name,
          wallet_address
        ),
        inviter:users!organization_members_invited_by_fkey (
          id,
          email,
          name
        )
      `
      )
      .eq("organization_id", id);

    if (membersError) {
      console.error("Error fetching members:", membersError);
      return res.status(500).json({
        success: false,
        error: {
          error: "Failed to fetch organization members",
          code: "FETCH_ERROR",
          details: membersError,
        },
      });
    }

    // Parse raw members first
    const validatedRawMembers = z.array(RawMemberSchema).parse(rawMembers);

    // Transform into the response format
    const transformedMembers = validatedRawMembers.map((member) => ({
      user_id: member.user_id,
      organization_id: member.organization_id,
      role: member.role,
      status: member.status,
      email: member.user?.email || member.email,
      name: member.user?.name || member.name,
      wallet_address: member.user?.wallet_address || member.wallet_address,
      created_at: member.created_at,
      invited_by: member.invited_by,
      invited_at: member.invited_at,
      user: member.user
        ? {
            id: member.user.id,
            email: member.user.email,
            name: member.user.name,
            wallet_address: member.user.wallet_address,
          }
        : null,
      inviter: member.inviter
        ? {
            id: member.inviter.id,
            email: member.inviter.email,
            name: member.inviter.name,
          }
        : null,
    }));

    // Validate the transformed data
    const validatedMembers = transformedMembers.map((member) =>
      OrganizationMemberResponseSchema.parse(member)
    );

    return res.status(200).json({
      success: true,
      data: validatedMembers,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({
      success: false,
      error: {
        error: "An unexpected error occurred",
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

export default withAuth(handler);
