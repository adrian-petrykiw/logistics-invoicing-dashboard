// pages/api/payment-requests/create.ts
import { NextApiResponse } from "next";
import { withAuth, AuthedRequest } from "@/pages/api/_lib/auth";
import { ApiResponse, TransactionRecord } from "@/types/transaction";
import { supabaseAdmin } from "../_lib/supabase";
import { emailService } from "./email-service";
import { createPaymentRequestEmailHtml } from "./email-templates";
import { z } from "zod";

const PaymentRequestSchema = z.object({
  organization_id: z.string().uuid(),
  token_mint: z.string(),
  amount: z.number(),
  sender: z.object({
    wallet_address: z.string(),
    multisig_address: z.string(),
    vault_address: z.string(),
  }),
  recipient: z.object({
    name: z.string(),
    email: z.string().email(),
  }),
  invoices: z.array(
    z.object({
      number: z.string(),
      amount: z.number(),
    })
  ),
  due_date: z.string(),
  restricted_payment_methods: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

async function handler(
  req: AuthedRequest,
  res: NextApiResponse<ApiResponse<TransactionRecord>>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" },
    });
  }

  try {
    const input = PaymentRequestSchema.parse(req.body);

    // Fetch organization details for sender email
    const { data: organization, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("business_details")
      .eq("id", input.organization_id)
      .single();

    if (orgError) throw orgError;
    if (!organization?.business_details?.companyEmail) {
      throw new Error("Organization email not found");
    }

    const senderEmail = organization.business_details.companyEmail;

    // Create transaction record with payment request status
    const { data: transaction, error } = await supabaseAdmin
      .from("transactions")
      .insert({
        organization_id: input.organization_id,
        signature: "pending",
        token_mint: input.token_mint,
        amount: input.amount,
        transaction_type: "payment",
        status: "draft",
        sender: input.sender,
        recipient: {
          multisig_address: "pending",
          vault_address: "pending",
        },
        invoices: input.invoices,
        due_date: input.due_date,
        restricted_payment_methods: input.restricted_payment_methods || [],
        metadata: {
          payment_request: {
            recipient_info: input.recipient,
            notes: input.notes,
          },
          sender_email: senderEmail,
        },
        created_by: req.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        proof_data: {
          encryption_keys: {},
          payment_hashes: {},
        },
      })
      .select()
      .single();

    if (error) throw error;

    try {
      await emailService.sendEmail(
        senderEmail,
        "Payment Request Created",
        createPaymentRequestEmailHtml({
          type: "requester",
          paymentRequest: transaction,
        })
      );

      await emailService.sendEmail(
        input.recipient.email,
        "New Payment Request",
        createPaymentRequestEmailHtml({
          type: "recipient",
          paymentRequest: transaction,
        })
      );
    } catch (emailError: any) {
      console.error("Failed to send email notifications:", emailError);
      throw Error("Failed to send email notifications:", emailError);
    }

    return res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error("Error creating payment request:", error);
    return res.status(500).json({
      success: false,
      error: {
        error: "Failed to create payment request",
        code: "CREATE_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

export default withAuth(handler);
