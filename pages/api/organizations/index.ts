import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../_lib/supabase";
import { CreateOrganizationInputSchema } from "@/schemas/organizationSchemas";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get user info from middleware-added headers
  const userId = req.headers["x-supabase-user-id"] as string;
  const walletAddress = req.headers["x-wallet-address"] as string;

  if (!userId || !walletAddress) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    switch (req.method) {
      case "GET":
        // Get organizations where user is a member
        const { data: organizations, error: getError } = await supabaseAdmin
          .from("organizations")
          .select(
            `
            *,
            organization_members!inner (
              role
            )
          `
          )
          .eq("organization_members.user_id", userId);

        if (getError) throw getError;
        return res.status(200).json(organizations);

      case "POST":
        const validatedData = CreateOrganizationInputSchema.parse(req.body);

        // Start a transaction
        const { data: newOrg, error: createOrgError } = await supabaseAdmin
          .from("organizations")
          .insert({
            ...validatedData,
            created_by: userId,
          })
          .select()
          .single();

        if (createOrgError) throw createOrgError;

        // Add creator as owner
        const { error: createMemberError } = await supabaseAdmin
          .from("organization_members")
          .insert({
            user_id: userId,
            organization_id: newOrg.id,
            role: "owner",
            personal_wallet: walletAddress,
          });

        if (createMemberError) throw createMemberError;

        return res.status(201).json(newOrg);

      default:
        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
