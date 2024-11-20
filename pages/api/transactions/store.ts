// pages/api/transactions/store.ts
import { NextApiResponse } from "next";
import { withAuth, AuthedRequest } from "@/pages/api/_lib/auth";
import { ApiResponse, TransactionRecord } from "@/types/transaction";
import { supabaseAdmin } from "../_lib/supabase";
import { z } from "zod";

const TransactionPartySchema = z.object({
  multisig_address: z.string(),
  vault_address: z.string(),
  wallet_address: z.string().optional(),
});

const ProofDataSchema = z.object({
  encryption_keys: z.record(z.string()),
  payment_hashes: z.record(z.string()),
});

const StoreTransactionSchema = z.object({
  organization_id: z.string().uuid(),
  signature: z.string(),
  token_mint: z.string(),
  proof_data: ProofDataSchema,
  amount: z.number(),
  transaction_type: z.enum(["payment", "transfer", "other"]),
  sender: TransactionPartySchema,
  recipient: TransactionPartySchema,
  invoices: z.array(
    z.object({
      number: z.string(),
      amount: z.number(),
    })
  ),
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
    const input = StoreTransactionSchema.parse(req.body);

    const { data: transaction, error } = await supabaseAdmin
      .from("transactions")
      .insert({
        ...input,
        status: "confirmed",
        created_by: req.user.id,
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
    console.error("Error storing transaction:", error);
    return res.status(500).json({
      success: false,
      error: {
        error: "Failed to store transaction",
        code: "STORE_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

export default withAuth(handler);
