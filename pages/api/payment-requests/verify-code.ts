// pages/api/payment-requests/verify-code.ts
import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/pages/api/_lib/auth";
import { supabaseAdmin } from "@/pages/api/_lib/supabase";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" },
    });
  }

  try {
    const { email, code, organizationId } = req.body;

    if (!email || !code || !organizationId) {
      return res.status(400).json({
        success: false,
        error: { error: "Missing required fields", code: "MISSING_FIELDS" },
      });
    }

    // Get verification code record
    const { data: verificationRecord, error: verifyError } = await supabaseAdmin
      .from("verification_codes")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("email", email)
      .eq("used", false)
      .single();

    if (verifyError || !verificationRecord) {
      return res.status(404).json({
        success: false,
        error: { error: "Verification code not found", code: "NOT_FOUND" },
      });
    }

    // Check if code is expired
    if (new Date(verificationRecord.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        error: { error: "Verification code expired", code: "CODE_EXPIRED" },
      });
    }

    // Verify code
    if (verificationRecord.code !== code) {
      return res.status(400).json({
        success: false,
        error: { error: "Invalid verification code", code: "INVALID_CODE" },
      });
    }

    // Mark code as used
    const { error: updateError } = await supabaseAdmin
      .from("verification_codes")
      .update({ used: true })
      .eq("id", verificationRecord.id);

    if (updateError) {
      console.error("Error updating verification code:", updateError);
      throw new Error("Failed to mark code as used");
    }

    return res.status(200).json({
      success: true,
      data: { message: "Code verified successfully" },
    });
  } catch (error) {
    console.error("Error verifying code:", error);
    return res.status(500).json({
      success: false,
      error: {
        error: "Failed to verify code",
        code: "VERIFY_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

export default withAuth(handler);
