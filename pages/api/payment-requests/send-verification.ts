// pages/api/payment-requests/send-verification.ts
import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/pages/api/_lib/auth";
import { supabaseAdmin } from "@/pages/api/_lib/supabase";
import { randomInt } from "crypto";
import { emailService } from "./email-service";
import { createVerificationEmailHtml } from "./verification-email";

// Helper to generate a 6-digit code
const generateVerificationCode = () => {
  return randomInt(100000, 999999).toString();
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" },
    });
  }

  try {
    const { email, organizationId } = req.body;

    if (!email || !organizationId) {
      return res.status(400).json({
        success: false,
        error: {
          error: "Email and organization ID are required",
          code: "MISSING_PARAMS",
        },
      });
    }

    // Get organization details by ID
    const { data: organization, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single();

    if (orgError || !organization) {
      console.error("Organization fetch error:", orgError);
      return res.status(404).json({
        success: false,
        error: { error: "Organization not found", code: "NOT_FOUND" },
      });
    }

    // Verify the email matches
    if (organization.business_details?.companyEmail !== email) {
      return res.status(400).json({
        success: false,
        error: {
          error: "Email does not match organization",
          code: "EMAIL_MISMATCH",
        },
      });
    }

    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Store verification code in Supabase
    const { error: verificationError } = await supabaseAdmin
      .from("verification_codes")
      .upsert(
        {
          organization_id: organization.id,
          code: verificationCode,
          expires_at: expiresAt.toISOString(),
          email,
          used: false,
        },
        {
          onConflict: "organization_id",
        }
      );

    if (verificationError) {
      console.error("Error storing verification code:", verificationError);
      throw new Error("Failed to store verification code");
    }

    // Send verification email
    const emailHtml = createVerificationEmailHtml({
      code: verificationCode,
      organizationName: organization.name,
      email,
    });

    await emailService.sendEmail(
      email,
      "Verificayion Code - CargoBill",
      emailHtml
    );

    return res.status(200).json({
      success: true,
      data: { message: "Verification code sent" },
    });
  } catch (error) {
    console.error("Error sending verification code:", error);
    return res.status(500).json({
      success: false,
      error: {
        error: "Failed to send verification code",
        code: "SEND_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

export default withAuth(handler);
