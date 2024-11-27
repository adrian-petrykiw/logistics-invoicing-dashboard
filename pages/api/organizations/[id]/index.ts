// pages/api/organizations/[id]/index.ts
import { NextApiResponse } from "next";
import { withAuth, AuthedRequest } from "@/pages/api/_lib/auth";
import { supabaseAdmin } from "../../_lib/supabase";
import { ApiResponse } from "@/types/vendor";

interface OrganizationDetails {
  id: string;
  name: string;
  multisig_wallet: string;
  vault_address: string;
  business_details: Record<string, any>;
}

async function handler(
  req: AuthedRequest,
  res: NextApiResponse<ApiResponse<OrganizationDetails>>
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: {
        error: "Method not allowed",
        code: "METHOD_NOT_ALLOWED",
      },
    });
  }

  const { id } = req.query;

  try {
    const { data: org, error } = await supabaseAdmin
      .from("organizations")
      .select(
        `
        id,
        name,
        multisig_wallet,
        vault_address,
        business_details
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching organization:", error);
      throw error;
    }

    if (!org) {
      return res.status(404).json({
        success: false,
        error: {
          error: "Organization not found",
          code: "NOT_FOUND",
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: org,
    });
  } catch (error) {
    console.error("Error fetching organization details:", error);
    return res.status(500).json({
      success: false,
      error: {
        error: "Failed to fetch organization details",
        code: "FETCH_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

export default withAuth(handler);
