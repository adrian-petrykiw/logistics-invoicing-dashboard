// pages/api/payment-requests/complete.ts
import { NextApiResponse } from "next";
import { withAuth, AuthedRequest } from "@/pages/api/_lib/auth";
import { ApiResponse } from "@/types/cargobill";
import { supabaseAdmin } from "../_lib/supabase";
import { z } from "zod";

const ProofDataSchema = z.object({
  encryption_keys: z.record(z.string()),
  payment_hashes: z.record(z.string()),
});

const TransactionPartySchema = z.object({
  multisig_address: z.string(),
  vault_address: z.string(),
  wallet_address: z.string().optional(),
});

const CompletePaymentRequestSchema = z.object({
  id: z.string().uuid(),
  signature: z.string(),
  proof_data: ProofDataSchema,
  sender: TransactionPartySchema,
  recipient: TransactionPartySchema,
});

async function handler(
  req: AuthedRequest,
  res: NextApiResponse<ApiResponse<any>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" },
    });
  }

  try {
    const input = CompletePaymentRequestSchema.parse(req.body);

    const { data: updatedTransaction, error } = await supabaseAdmin
      .from("transactions")
      .update({
        signature: input.signature,
        status: "confirmed",
        proof_data: input.proof_data,
        sender: input.sender,
        recipient: input.recipient,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating transaction:", error);
      throw error;
    }

    return res.status(200).json({
      success: true,
      data: updatedTransaction,
    });
  } catch (error) {
    console.error("Error completing payment request:", error);
    return res.status(500).json({
      success: false,
      error: {
        error: "Failed to complete payment request",
        code: "COMPLETION_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

export default withAuth(handler);
