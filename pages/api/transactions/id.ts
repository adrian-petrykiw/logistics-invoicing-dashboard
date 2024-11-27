// pages/api/transactions/[id].ts
import { NextApiResponse } from "next";
import { withAuth, AuthedRequest } from "@/pages/api/_lib/auth";
import { ApiResponse, TransactionRecord } from "@/types/cargobill";
import { supabaseAdmin } from "../_lib/supabase";

async function handler(
  req: AuthedRequest,
  res: NextApiResponse<ApiResponse<TransactionRecord>>
) {
  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const { data: transaction, error } = await supabaseAdmin
        .from("transactions")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: {
            error: "Transaction not found",
            code: "NOT_FOUND",
          },
        });
      }

      return res.status(200).json({
        success: true,
        data: transaction as TransactionRecord,
      });
    } catch (error) {
      console.error("Error fetching transaction:", error);
      return res.status(500).json({
        success: false,
        error: {
          error: "Failed to fetch transaction",
          code: "FETCH_ERROR",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  if (req.method === "PATCH") {
    try {
      const { status } = req.body;

      const { data: transaction, error } = await supabaseAdmin
        .from("transactions")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        data: transaction as TransactionRecord,
      });
    } catch (error) {
      console.error("Error updating transaction:", error);
      return res.status(500).json({
        success: false,
        error: {
          error: "Failed to update transaction",
          code: "UPDATE_ERROR",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" },
  });
}

export default withAuth(handler);
