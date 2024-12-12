import { NextApiResponse } from "next";
import { withAuth, AuthedRequest } from "@/pages/api/_lib/auth";
import { ApiResponse, TransactionRecord } from "@/types/transaction";
import { supabaseAdmin } from "../_lib/supabase";
import { emailService } from "./email-service";
import { createPaymentRequestEmailHtml } from "./email-templates";
import { z } from "zod";
import { getVaultPda } from "@sqds/multisig";
import { PublicKey } from "@solana/web3.js";

const PaymentRequestSchema = z.object({
  sending_organization: z
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
  receiving_organization_id: z.string().uuid(),
  creator_email: z.string().email(),
  token_mint: z.string(),
  amount: z.number(),
  sender: z
    .object({
      wallet_address: z.string().optional(),
      multisig_address: z.string().optional(),
      vault_address: z.string().optional(),
    })
    .optional(),
  recipient: z.object({
    wallet_address: z.string().optional(),
    multisig_address: z.string(),
    vault_address: z.string(),
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
    let currentRecipientOrg: any;

    // Handle organization for the recipient (who will be paying)
    if (!input.sending_organization.id) {
      // Create placeholder organization for new vendor
      const { data: newOrg, error: newOrgError } = await supabaseAdmin
        .from("organizations")
        .insert({
          name: input.sending_organization.name!,
          multisig_wallet: "pending",
          business_details: {
            companyName: input.sending_organization.name!,
            companyEmail: input.sending_organization.email!,
            ownerName: "Pending Registration",
            ownerEmail: input.sending_organization.email!,
            ownerWalletAddress: "pending",
          },
          created_by: user.id,
        })
        .select()
        .single();

      if (newOrgError) throw newOrgError;
      recipientOrgId = newOrg.id;
      recipientEmail = input.sending_organization.email!;
      currentRecipientOrg = newOrg;
    } else {
      // Fetch existing organization's details
      const { data: existingOrg, error: orgError } = await supabaseAdmin
        .from("organizations")
        .select("id, business_details, multisig_wallet")
        .eq("id", input.sending_organization.id)
        .single();

      if (orgError || !existingOrg) {
        throw new Error("Organization not found");
      }
      if (!existingOrg.business_details?.companyEmail) {
        throw new Error("Organization email not found");
      }

      recipientOrgId = existingOrg.id;
      recipientEmail = existingOrg.business_details.companyEmail;
      currentRecipientOrg = existingOrg;
    }

    // Derive vault address for existing organizations with valid multisig
    let senderVaultAddress = "pending";
    if (
      currentRecipientOrg?.multisig_wallet &&
      currentRecipientOrg.multisig_wallet !== "pending"
    ) {
      try {
        const multisigPda = new PublicKey(currentRecipientOrg.multisig_wallet);
        const [vaultPda] = getVaultPda({
          multisigPda,
          index: 0,
        });
        senderVaultAddress = vaultPda.toBase58();
      } catch (error) {
        console.error("Failed to derive vault address:", error);
        throw Error("Failed to derive vault address");
      }
    }

    // Create transaction record with correct sender/recipient
    const { data: transaction, error: transError } = await supabaseAdmin
      .from("transactions")
      .insert({
        organization_id: recipientOrgId,
        signature: `pending_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        token_mint: input.token_mint,
        amount: input.amount,
        transaction_type: "request",
        status: "open",
        sender: {
          wallet_address: "pending",
          multisig_address: currentRecipientOrg?.multisig_wallet || "pending",
          vault_address: senderVaultAddress,
        },
        recipient: {
          wallet_address: req.user.walletAddress,
          multisig_address: input.recipient.multisig_address,
          vault_address: input.recipient.vault_address,
        },
        invoices: input.invoices,
        due_date: input.due_date,
        restricted_payment_methods: input.restricted_payment_methods || [],
        metadata: {
          payment_request: {
            notes: input.notes,
            creator_email: input.creator_email,
            creator_wallet_address: req.user.walletAddress,
            creator_organization_id: input.receiving_organization_id,
            creator_organization_name:
              currentRecipientOrg?.business_details.companyName ||
              "Organization name not provided",
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
      // Send email to recipient organization (future sender)
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
      throw Error("Failed to send email notifications: ", emailError);
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
