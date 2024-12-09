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
    console.log("Fetching payment request with ID:", id);

    const { data: paymentRequest, error } = await supabaseAdmin
      .from("transactions")
      .select(
        `
        id,
        amount,
        due_date,
        status,
        metadata,
        invoices,
        sender,
        recipient,
        organization_id
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    if (!paymentRequest) {
      return res.status(404).json({
        success: false,
        error: { error: "Payment request not found", code: "NOT_FOUND" },
      });
    }

    // Fetch the sender organization (the one that will make the payment)
    const { data: senderOrganization } = await supabaseAdmin
      .from("organizations")
      .select("name, business_details")
      .eq("id", paymentRequest.organization_id)
      .single();

    // Fetch the recipient organization (the one that created the payment request)
    const { data: recipientOrganization } = await supabaseAdmin
      .from("organizations")
      .select("name, business_details")
      .eq(
        "multisig_wallet",
        paymentRequest.metadata.payment_request.creator_organization_id
      )
      .single();

    const transformedData: PaymentRequestDetails = {
      id: paymentRequest.id,
      amount: paymentRequest.amount,
      due_date: paymentRequest.due_date,
      status: paymentRequest.status,
      creator_email: paymentRequest.metadata?.payment_request?.creator_email,
      invoices: paymentRequest.invoices || [],
      metadata: paymentRequest.metadata || {},
      sender: {
        wallet_address: paymentRequest.sender.wallet_address,
        multisig_address: paymentRequest.sender.multisig_address,
        vault_address: paymentRequest.sender.vault_address,
        organization: senderOrganization
          ? {
              name: senderOrganization.name,
              business_details: senderOrganization.business_details,
            }
          : undefined,
      },
      recipient: {
        multisig_address: paymentRequest.recipient.multisig_address,
        vault_address: paymentRequest.recipient.vault_address,
        organization: recipientOrganization
          ? {
              name: recipientOrganization.name,
              business_details: recipientOrganization.business_details,
            }
          : undefined,
      },
    };

    return res.status(200).json({
      success: true,
      data: transformedData,
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
