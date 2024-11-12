// vendors/index.ts
import { NextApiResponse } from "next";
import { withAuth, AuthedRequest } from "@/pages/api/_lib/auth";
import { VendorListItem, ApiResponse } from "@/types/vendor";
import { supabaseAdmin } from "../_lib/supabase";

interface OrganizationWithMembers {
  id: string;
  business_details: {
    companyName: string;
    [key: string]: any;
  };
  organization_members: Array<{
    wallet_address: string;
    role: string;
  }> | null;
}

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

  try {
    console.log("Current user:", req.user);

    // First get the user's own organizations (where they are a member)
    const { data: memberOrgs, error: memberError } = await supabaseAdmin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", req.user.id);

    if (memberError) {
      console.error("Error fetching member organizations:", memberError);
      throw memberError;
    }

    // Get all organizations first to verify data
    const { data: allOrgs, error: allOrgsError } = await supabaseAdmin
      .from("organizations")
      .select("*");

    console.log("All organizations:", allOrgs);

    // Build a query to get organizations where the user is not a member
    const query = supabaseAdmin.from("organizations").select(
      `
        id,
        business_details,
        organization_members (
          wallet_address,
          role
        )
      `
    );

    // If they have organizations, exclude them
    if (memberOrgs && memberOrgs.length > 0) {
      const orgIds = memberOrgs.map((org) => org.organization_id);
      query.not("id", "in", orgIds);
    }

    // Log the full query
    console.log("Supabase query:", query);

    const { data: orgs, error: orgsError } = await query.returns<
      OrganizationWithMembers[]
    >();

    // Log raw response
    console.log("Raw Supabase response:", { data: orgs, error: orgsError });

    if (orgsError) {
      console.error("Error fetching organizations:", orgsError);
      throw orgsError;
    }

    if (!orgs) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    // Transform into vendor list format
    const vendors = orgs.map((org) => ({
      id: org.id,
      name: org.business_details.companyName || "Unknown Company",
    }));

    console.log("Final transformed vendors:", vendors);

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
