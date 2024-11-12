// vendors/[id].ts
import { NextApiResponse } from "next";
import { withAuth, AuthedRequest } from "@/pages/api/_lib/auth";
import { supabaseAdmin } from "../_lib/supabase";
import { ApiResponse, VendorDetails } from "@/types/vendor";

async function handler(
  req: AuthedRequest,
  res: NextApiResponse<ApiResponse<VendorDetails>>
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
        business_details
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!org) {
      return res.status(404).json({
        success: false,
        error: {
          error: "Vendor not found",
          code: "NOT_FOUND",
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: org.id,
        business_details: org.business_details,
      },
    });
  } catch (error) {
    console.error("Error fetching vendor:", error);
    return res.status(500).json({
      success: false,
      error: {
        error: "Failed to fetch vendor",
        code: "FETCH_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

export default withAuth(handler);
