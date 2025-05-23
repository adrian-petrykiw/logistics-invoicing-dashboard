// pages/api/auth/check-invites.ts
import { NextApiResponse } from "next";
import { AuthedRequest, withAuth } from "../_lib/auth";
import { supabaseAdmin } from "../_lib/supabase";

type ApiResponse =
  | {
      invitesActivated: boolean;
      activatedCount: number;
      isOwner?: boolean;
    }
  | {
      error: string;
    };

async function handler(
  req: AuthedRequest,
  res: NextApiResponse<ApiResponse>
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const { email, walletAddress } = req.body;

  try {
    const { data: ownerCheck, error: ownerError } = await supabaseAdmin
      .from("organization_members")
      .select("role")
      .eq("email", email)
      .eq("role", "owner")
      .single();

    if (ownerError && ownerError.code !== "PGRST116") {
      throw ownerError;
    }

    if (ownerCheck?.role === "owner") {
      return res.status(200).json({
        invitesActivated: false,
        activatedCount: 0,
        isOwner: true,
      });
    }

    const { data: updatedMembers, error: updateError } = await supabaseAdmin
      .from("organization_members")
      .update({
        status: "active",
        wallet_address: walletAddress,
        user_id: req.user!.id,
      })
      .eq("email", email)
      .eq("status", "invited")
      .select();

    if (updateError) throw updateError;

    res.status(200).json({
      invitesActivated: updatedMembers && updatedMembers.length > 0,
      activatedCount: updatedMembers?.length || 0,
      isOwner: false,
    });
    return;
  } catch (error) {
    console.error("Check invites error:", error);
    res.status(500).json({ error: "Failed to check invites" });
    return;
  }
}

export default withAuth(handler);
