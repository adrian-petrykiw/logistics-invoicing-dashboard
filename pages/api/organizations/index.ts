// pages/api/organizations/index.ts
import { NextApiResponse } from "next";
import { withAuth, AuthedRequest } from "@/pages/api/_lib/auth";
import { supabaseAdmin } from "../_lib/supabase";
import {
  CreateOrganizationInputSchema,
  OrganizationResponse,
  ApiResponse,
  Organization,
  OrganizationWithMemberSchema,
} from "@/schemas/organization";
import { z } from "zod";

async function handler(
  req: AuthedRequest,
  res: NextApiResponse<
    ApiResponse<OrganizationResponse[] | OrganizationResponse>
  >
) {
  // Ensure we have a user
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: { error: "Unauthorized", code: "UNAUTHORIZED" },
    });
  }

  try {
    switch (req.method) {
      case "GET": {
        // Fetch organizations where user is a member
        const { data: rawOrganizations, error: getError } = await supabaseAdmin
          .from("organizations")
          .select(
            `
            *,
            organization_members!inner (
              role
            )
          `
          )
          .eq("organization_members.user_id", req.user.id);

        if (getError) {
          console.error("Database error:", getError);
          return res.status(500).json({
            success: false,
            error: {
              error: "Failed to fetch organizations",
              code: "DB_ERROR",
              details: getError,
            },
          });
        }

        // If no organizations found, return empty array
        if (!rawOrganizations) {
          return res.status(200).json({
            success: true,
            data: [],
          });
        }

        try {
          // Validate and format organizations
          const validatedOrgs = z
            .array(OrganizationWithMemberSchema)
            .parse(rawOrganizations);
          const organizations = validatedOrgs.map(
            ({ organization_members, ...org }) => org
          );

          return res.status(200).json({
            success: true,
            data: organizations,
          });
        } catch (validationError) {
          console.error("Validation error:", validationError);
          return res.status(500).json({
            success: false,
            error: {
              error: "Invalid data format",
              code: "VALIDATION_ERROR",
              details:
                validationError instanceof Error
                  ? validationError.message
                  : "Unknown validation error",
            },
          });
        }
      }

      case "POST": {
        try {
          // Validate input data
          const validatedData = CreateOrganizationInputSchema.parse(req.body);

          console.log("Creating organization with data:", validatedData);

          // Check if organization with this multisig wallet already exists
          const { data: existingOrg } = await supabaseAdmin
            .from("organizations")
            .select("id")
            .eq("multisig_wallet", validatedData.multisig_wallet)
            .single();

          if (existingOrg) {
            return res.status(409).json({
              success: false,
              error: {
                error: "Organization with this multisig wallet already exists",
                code: "DUPLICATE_MULTISIG",
              },
            });
          }

          // Start a Supabase transaction
          const { data: newOrg, error: createOrgError } = await supabaseAdmin
            .from("organizations")
            .insert({
              name: validatedData.name,
              multisig_wallet: validatedData.multisig_wallet,
              business_details: validatedData.business_details,
              created_by: req.user.id,
            })
            .select()
            .single();

          if (createOrgError) {
            console.error("Organization creation error:", createOrgError);
            throw createOrgError;
          }

          if (!newOrg) {
            throw new Error("Failed to create organization");
          }

          // Format the timestamp to match our expected format
          const formattedOrg = {
            ...newOrg,
            created_at: new Date(newOrg.created_at).toISOString(),
          };

          // Add owner member record
          const { error: createMemberError } = await supabaseAdmin
            .from("organization_members")
            .insert({
              organization_id: formattedOrg.id,
              user_id: req.user.id,
              role: "owner",
              status: "active",
              wallet_address: validatedData.business_details.ownerWalletAddress,
              name: validatedData.business_details.ownerName,
              email: validatedData.business_details.ownerEmail,
            });

          if (createMemberError) {
            console.error("Member creation error:", createMemberError);
            // Rollback organization creation
            await supabaseAdmin
              .from("organizations")
              .delete()
              .eq("id", formattedOrg.id);
            throw createMemberError;
          }

          return res.status(201).json({
            success: true,
            data: formattedOrg,
          });
        } catch (error) {
          console.error("Organization creation error:", error);
          return res.status(500).json({
            success: false,
            error: {
              error: "Failed to create organization",
              code: "CREATE_ERROR",
              details: error instanceof Error ? error.message : String(error),
            },
          });
        }
      }

      default:
        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).json({
          success: false,
          error: {
            error: `Method ${req.method} Not Allowed`,
            code: "METHOD_NOT_ALLOWED",
          },
        });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      success: false,
      error: {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

export default withAuth(handler);

// import { NextApiResponse } from "next";
// import { withAuth, AuthedRequest } from "@/pages/api/_lib/auth";
// import { ApiResponse } from "@/types/vendor";
// import { supabaseAdmin } from "../_lib/supabase";
// import { OrganizationResponse } from "@/schemas/organization";

// async function handler(
//   req: AuthedRequest,
//   res: NextApiResponse<ApiResponse<OrganizationResponse[]>>
// ) {
//   if (req.method !== "GET") {
//     return res.status(405).json({
//       success: false,
//       error: {
//         error: "Method not allowed",
//         code: "METHOD_NOT_ALLOWED",
//       },
//     });
//   }

//   try {
//     console.log("Current user:", req.user);

//     // First get the user's organizations (where they are a member)
//     const { data: organizations, error: orgsError } = await supabaseAdmin
//       .from("organizations")
//       .select(
//         `
//         *,
//         organization_members!inner (
//           user_id,
//           role
//         )
//       `
//       )
//       .eq("organization_members.user_id", req.user.id);

//     if (orgsError) {
//       console.error("Error fetching organizations:", orgsError);
//       throw orgsError;
//     }

//     // If no organizations found, return empty array
//     if (!organizations) {
//       return res.status(200).json({
//         success: true,
//         data: [],
//       });
//     }

//     // Map the organizations to match the OrganizationResponse type
//     const formattedOrgs: OrganizationResponse[] = organizations.map((org) => ({
//       id: org.id,
//       name: org.name,
//       multisig_wallet: org.multisig_wallet,
//       business_details: org.business_details,
//       created_at: org.created_at,
//       created_by: org.created_by,
//     }));

//     return res.status(200).json({
//       success: true,
//       data: formattedOrgs,
//     });
//   } catch (error) {
//     console.error("Error in organization listing:", error);
//     return res.status(500).json({
//       success: false,
//       error: {
//         error: "Failed to fetch organizations",
//         code: "FETCH_ERROR",
//         details: error instanceof Error ? error.message : "Unknown error",
//       },
//     });
//   }
// }

// export default withAuth(handler);
