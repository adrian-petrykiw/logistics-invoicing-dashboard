// pages/api/payment-requests/create.ts
import { NextApiResponse } from "next";
import { withAuth, AuthedRequest } from "@/pages/api/_lib/auth";
import { ApiResponse, TransactionRecord } from "@/types/transaction";
import { supabaseAdmin } from "../_lib/supabase";
import { emailService } from "./email-service";
import { createPaymentRequestEmailHtml } from "./email-templates";
import { z } from "zod";

const PaymentRequestSchema = z.object({
  organization: z
    .object({
      id: z.string().uuid().optional(),
      name: z.string().optional(),
      email: z.string().email().optional(),
    })
    .refine(
      (data) => {
        return (
          (data.id !== undefined && !data.name && !data.email) ||
          (data.id === undefined &&
            data.name !== undefined &&
            data.email !== undefined)
        );
      },
      {
        message:
          "Either provide organization.id OR both organization.name and organization.email, but not both",
      }
    ),
  creator_email: z.string().email(),
  token_mint: z.string(),
  amount: z.number(),
  sender: z.object({
    wallet_address: z.string(),
    multisig_address: z.string(),
    vault_address: z.string(),
  }),
  recipient: z
    .object({
      multisig_address: z.string(),
      vault_address: z.string(),
    })
    .optional(),
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

  // Get the user from the database
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("wallet_address", req.user.walletAddress)
    .single();

  if (!user) {
    return res.status(404).json({
      success: false,
      error: { error: "User not found", code: "USER_NOT_FOUND" },
    });
  }

  try {
    const input = PaymentRequestSchema.parse(req.body);
    let recipientOrgId: string;
    let recipientEmail: string;

    // Handle organization
    if (!input.organization.id) {
      // Create placeholder organization for new vendor
      const { data: newOrg, error: newOrgError } = await supabaseAdmin
        .from("organizations")
        .insert({
          name: input.organization.name!,
          multisig_wallet: "pending",
          business_details: {
            companyName: input.organization.name!,
            companyEmail: input.organization.email!,
            ownerName: "Pending Registration",
            ownerEmail: input.organization.email!,
            ownerWalletAddress: "pending",
          },
          created_by: user.id,
        })
        .select()
        .single();

      if (newOrgError) throw newOrgError;
      recipientOrgId = newOrg.id;
      recipientEmail = input.organization.email!;
    } else {
      // Fetch existing organization's details
      const { data: existingOrg, error: orgError } = await supabaseAdmin
        .from("organizations")
        .select("id, business_details")
        .eq("id", input.organization.id)
        .single();

      if (orgError || !existingOrg) {
        throw new Error("Organization not found");
      }
      if (!existingOrg.business_details?.companyEmail) {
        throw new Error("Organization email not found");
      }

      recipientOrgId = existingOrg.id;
      recipientEmail = existingOrg.business_details.companyEmail;
    }

    // Create transaction record
    const { data: transaction, error: transError } = await supabaseAdmin
      .from("transactions")
      .insert({
        organization_id: recipientOrgId,
        signature: `pending_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        token_mint: input.token_mint,
        amount: input.amount,
        transaction_type: "payment",
        status: "draft",
        sender: input.sender,
        recipient: input.recipient || {
          multisig_address: "pending",
          vault_address: "pending",
        },
        invoices: input.invoices,
        due_date: input.due_date,
        restricted_payment_methods: input.restricted_payment_methods || [],
        metadata: {
          payment_request: {
            notes: input.notes,
            creator_email: input.creator_email,
          },
        },
        created_by: user.id,
        proof_data: {
          encryption_keys: {},
          payment_hashes: {},
        },
      })
      .select()
      .single();

    if (transError) throw transError;

    // Handle email notifications
    try {
      // Send email to recipient organization
      await emailService.sendEmail(
        recipientEmail,
        "New Payment Request",
        createPaymentRequestEmailHtml({
          type: "recipient",
          paymentRequest: transaction,
        })
      );

      // Send confirmation email to creator
      await emailService.sendEmail(
        input.creator_email,
        "Payment Request Created",
        createPaymentRequestEmailHtml({
          type: "requester",
          paymentRequest: transaction,
        })
      );
    } catch (emailError: any) {
      console.error("Failed to send email notifications:", emailError);
      // Continue even if emails fail
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
