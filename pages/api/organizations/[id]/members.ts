import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../_lib/supabase";
import { AddMemberInputSchema } from "@/schemas/orgSchemas";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const userId = req.headers["x-supabase-user-id"] as string;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Check if user has permission (owner/admin)
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("organization_members")
      .select("role")
      .eq("user_id", userId)
      .eq("organization_id", id)
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
        const { data: members, error: getError } = await supabaseAdmin
          .from("organization_members")
          .select(
            `
            *,
            users (
              email,
              wallet_address
            )
          `
          )
          .eq("organization_id", id);

        if (getError) throw getError;
        return res.status(200).json(members);

      case "POST":
        const validatedData = AddMemberInputSchema.parse(req.body);

        // Check if user exists, if not create them
        const { data: existingUser, error: userError } = await supabaseAdmin
          .from("users")
          .select()
          .eq("email", validatedData.email)
          .single();

        let targetUserId = existingUser?.id;

        if (!targetUserId) {
          const { data: newUser, error: createUserError } = await supabaseAdmin
            .from("users")
            .insert({
              email: validatedData.email,
              wallet_address: validatedData.personal_wallet,
              particle_user_id: "pending", // They'll update this when they sign in
            })
            .select()
            .single();

          if (createUserError) throw createUserError;
          targetUserId = newUser.id;
        }

        const { data: newMember, error: createError } = await supabaseAdmin
          .from("organization_members")
          .insert({
            user_id: targetUserId,
            organization_id: id as string,
            role: validatedData.role,
            personal_wallet: validatedData.personal_wallet,
          })
          .select()
          .single();

        if (createError) throw createError;
        return res.status(201).json(newMember);

      default:
        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
