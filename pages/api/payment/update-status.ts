import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { partnerUserId, status, amount, tx_hash, wallet_address } = req.body;

  try {
    const { error } = await supabase.from("payment_transactions").upsert({
      partner_user_id: partnerUserId,
      status,
      amount: amount || "0",
      transaction_data:
        tx_hash && wallet_address
          ? {
              tx_hash,
              wallet_address,
            }
          : undefined,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Failed to update payment status:", error);
    res.status(500).json({ message: "Failed to update payment status" });
  }
}
