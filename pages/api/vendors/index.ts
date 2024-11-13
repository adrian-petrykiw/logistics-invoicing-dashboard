// pages/api/vendors/index.ts
import { NextApiResponse } from "next";
import { AuthedRequest, withAuth } from "../_lib/auth";
import { ApiResponse, VendorListItem } from "@/types/vendor";
import { supabaseAdmin } from "../_lib/supabase";

async function handler(
  req: AuthedRequest,
  res: NextApiResponse<ApiResponse<VendorListItem[]>>
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

  if (!req.user?.id) {
    console.error("No user ID in request");
    return res.status(401).json({
      success: false,
      error: {
        error: "Unauthorized",
        code: "UNAUTHORIZED",
      },
    });
  }

  try {
    console.log("Fetching organizations for user:", req.user.id);

    // Get filtered organizations
    const { data: orgs, error: orgsError } = await supabaseAdmin
      .from("organizations")
      .select(
        `
        id,
        business_details,
        created_by
      `
      )
      .neq("created_by", req.user.id)
      .order("created_at", { ascending: false });

    if (orgsError) {
      console.error("Database error:", orgsError);
      throw orgsError;
    }

    console.log("Found organizations:", orgs?.length || 0);

    if (!orgs) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const vendors = orgs.map((org) => ({
      id: org.id,
      name: org.business_details.companyName || "Unknown Company",
    }));

    return res.status(200).json({
      success: true,
      data: vendors,
    });
  } catch (error) {
    console.error("Error in vendor listing:", error);
    return res.status(500).json({
      success: false,
      error: {
        error: "Failed to fetch vendors",
        code: "FETCH_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}
export default withAuth(handler);
