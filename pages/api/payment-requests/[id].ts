import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../_lib/supabase";
import { ApiResponse } from "@/types/cargobill";
import { PaymentRequestDetails } from "@/features/payment-requests/hooks/usePaymentRequest";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<PaymentRequestDetails>>
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" },
    });
  }

  try {
    const { id } = req.query;

    const { data: paymentRequest, error } = await supabaseAdmin
      .from("transactions")
      .select(
        `
        *,
        sender:sender_organization_id (
          name,
          business_details
        ),
        recipient:recipient_organization_id (
          name,
          business_details
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!paymentRequest) {
      return res.status(404).json({
        success: false,
        error: { error: "Payment request not found", code: "NOT_FOUND" },
      });
    }

    return res.status(200).json({
      success: true,
      data: paymentRequest as PaymentRequestDetails,
    });
  } catch (error) {
    console.error("Error fetching payment request:", error);
    return res.status(500).json({
      success: false,
      error: {
        error: "Failed to fetch payment request",
        code: "FETCH_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}
