// pages/api/organizations/[id]/members.ts
import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../_lib/supabase";
import { AddMemberInputSchema } from "@/schemas/organizationSchemas";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id: organizationId } = req.query;
  const userEmail = req.headers["x-user-email"] as string;

  if (!userEmail) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Check if user has permission (owner/admin)
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("organization_members")
      .select(
        `
        role,
        users!inner (
          email
        )
      `
      )
      .eq("organization_id", organizationId)
      .eq("users.email", userEmail)
      .single();

    if (
      membershipError ||
      !membership ||
      !["owner", "admin"].includes(membership.role)
    ) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    switch (req.method) {
      case "GET":
        // Get all members with their user details
        const { data: members, error: getError } = await supabaseAdmin
          .from("organization_members")
          .select(
            `
            *,
            users (
              id,
              email,
              name,
              wallet_address
            )
          `
          )
          .eq("organization_id", organizationId);

        if (getError) throw getError;

        // Transform the response to flatten user details
        const formattedMembers = members?.map((member) => ({
          id: member.user_id,
          email: member.users.email,
          name: member.users.name,
          role: member.role,
          wallet_address: member.wallet_address,
          created_at: member.created_at,
          organization_id: member.organization_id,
        }));

        return res.status(200).json(formattedMembers);

      case "POST":
        const validatedData = AddMemberInputSchema.parse(req.body);

        // Check if user exists
        const { data: existingUser, error: userError } = await supabaseAdmin
          .from("users")
          .select()
          .eq("email", validatedData.email)
          .single();

        let targetUserId = existingUser?.id;

        // Create new user if doesn't exist
        if (!targetUserId) {
          const { data: newUser, error: createUserError } = await supabaseAdmin
            .from("users")
            .insert({
              email: validatedData.email,
              name: validatedData.name,
              wallet_address: validatedData.wallet_address,
              particle_user_id: "pending", // Will be updated when they sign in
            })
            .select()
            .single();

          if (createUserError) throw createUserError;
          targetUserId = newUser.id;
        }

        // Check if member already exists
        const { data: existingMember } = await supabaseAdmin
          .from("organization_members")
          .select()
          .eq("user_id", targetUserId)
          .eq("organization_id", organizationId)
          .single();

        if (existingMember) {
          return res.status(400).json({
            error: "User is already a member of this organization",
          });
        }

        // Create organization member
        const { data: newMember, error: createError } = await supabaseAdmin
          .from("organization_members")
          .insert({
            user_id: targetUserId,
            organization_id: organizationId as string,
            role: validatedData.role,
            wallet_address: validatedData.wallet_address,
          })
          .select(
            `
            *,
            users (
              id,
              email,
              name,
              wallet_address
            )
          `
          )
          .single();

        if (createError) throw createError;

        // Format response
        const formattedMember = {
          id: newMember.user_id,
          email: newMember.users.email,
          name: newMember.users.name,
          role: newMember.role,
          wallet_address: newMember.wallet_address,
          created_at: newMember.created_at,
          organization_id: newMember.organization_id,
        };

        return res.status(201).json(formattedMember);

      case "PATCH":
        // Handle member updates...
        break;

      case "DELETE":
        // Handle member removal...
        break;

      default:
        res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
