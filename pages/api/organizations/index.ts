import { NextApiResponse } from "next";
import { supabaseAdmin } from "../_lib/supabase";
import {
  CreateOrganizationInputSchema,
  Organization,
  ApiError,
  ApiResponse,
  OrganizationResponseSchema,
  OrganizationWithMemberSchema,
} from "@/schemas/organization";
import { withAuth, AuthedRequest } from "../_lib/auth";
import { z } from "zod";

async function handler(
  req: AuthedRequest,
  res: NextApiResponse<ApiResponse<Organization[] | Organization>>
): Promise<void> {
  try {
    switch (req.method) {
      case "GET": {
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
          .eq("organization_members.user_id", req.user!.id);

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

        try {
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
          const validatedData = CreateOrganizationInputSchema.parse(req.body);

          console.log("Creating organization with data:", validatedData);

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

          if (createOrgError) throw createOrgError;

          console.log("Raw organization data from Supabase:", newOrg);

          // Format the timestamp to match our expected format
          const formattedOrg = {
            ...newOrg,
            created_at: new Date(newOrg.created_at).toISOString(),
          };

          console.log("Formatted organization data:", formattedOrg);

          try {
            const validatedOrg = OrganizationResponseSchema.parse(formattedOrg);

            // Add owner member record
            const { error: createMemberError } = await supabaseAdmin
              .from("organization_members")
              .insert({
                user_id: req.user.id,
                organization_id: validatedOrg.id,
                role: "owner",
                status: "active",
                wallet_address: req.user.walletAddress,
                name: validatedData.business_details.ownerName,
                email: validatedData.business_details.ownerEmail,
              });

            if (createMemberError) {
              await supabaseAdmin
                .from("organizations")
                .delete()
                .eq("id", validatedOrg.id);
              throw createMemberError;
            }

            return res.status(201).json({
              success: true,
              data: validatedOrg,
            });
          } catch (validationError) {
            console.error("Validation error:", validationError);
            // Cleanup the created organization if validation fails
            await supabaseAdmin
              .from("organizations")
              .delete()
              .eq("id", newOrg.id);

            throw validationError;
          }
        } catch (error) {
          console.error("Organization creation error:", error);
          return res.status(500).json({
            success: false,
            error: {
              error: "Failed to create organization",
              message: error instanceof Error ? error.message : String(error),
              code: error instanceof Error ? error.name : "CREATE_ERROR",
              details: error,
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
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof Error ? error.name : "UNKNOWN_ERROR",
      },
    });
  }
}

export default withAuth(handler);
