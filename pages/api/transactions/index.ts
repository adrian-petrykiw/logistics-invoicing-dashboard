import { NextApiResponse } from "next";
import { withAuth, AuthedRequest } from "@/pages/api/_lib/auth";
import { z } from "zod";
import { ApiResponse, TransactionRecord } from "@/types/cargobill";
import { supabaseAdmin } from "../_lib/supabase";

const CreateTransactionSchema = z.object({
  organization_id: z.string().uuid(),
  signature: z.string(),
  proof_json: z.string(),
  amount: z.number(),
  transaction_type: z.enum(["payment", "transfer", "other"]),
  sender_address: z.string(),
  recipient_address: z.string(),
  invoices: z.array(
    z.object({
      number: z.string(),
      amount: z.number(),
    })
  ),
  business_data: z.record(z.any()),
});

async function handler(
  req: AuthedRequest,
  res: NextApiResponse<ApiResponse<TransactionRecord | TransactionRecord[]>>
) {
  switch (req.method) {
    case "POST":
      return handleCreateTransaction(req, res);
    case "GET":
      return handleGetTransactions(req, res);
    default:
      return res.status(405).json({
        success: false,
        error: { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" },
      });
  }
}

async function handleCreateTransaction(
  req: AuthedRequest,
  res: NextApiResponse<ApiResponse<TransactionRecord>>
) {
  try {
    const input = CreateTransactionSchema.parse(req.body);

    const { data: transaction, error } = await supabaseAdmin
      .from("transactions")
      .insert({
        ...input,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      data: transaction as TransactionRecord,
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return res.status(500).json({
      success: false,
      error: {
        error: "Failed to create transaction",
        code: "CREATE_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

async function handleGetTransactions(
  req: AuthedRequest,
  res: NextApiResponse<ApiResponse<TransactionRecord[]>>
) {
  try {
    const { organization_id } = req.query;

    if (!organization_id) {
      throw new Error("Organization ID is required");
    }

    const { data: organization, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("multisig_wallet")
      .eq("id", organization_id)
      .single();

    if (orgError || !organization) {
      console.error("Organization fetch error:", orgError);
      throw new Error("Failed to fetch organization details");
    }

    console.log(
      "Found organization with multisig wallet:",
      organization.multisig_wallet
    );

    const { data: transactions, error: txError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .or(
        `sender->>multisig_address.eq."${organization.multisig_wallet}",recipient->>multisig_address.eq."${organization.multisig_wallet}"`
      )
      .order("created_at", { ascending: false });

    if (txError) {
      console.error("Transaction fetch error:", txError);
      throw txError;
    }

    console.log("Found transactions:", transactions?.length || 0);

    return res.status(200).json({
      success: true,
      data: transactions as TransactionRecord[],
    });
  } catch (error) {
    console.error("Error in handleGetTransactions:", error);
    return res.status(500).json({
      success: false,
      error: {
        error: "Failed to fetch transactions",
        code: "FETCH_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

export default withAuth(handler);
