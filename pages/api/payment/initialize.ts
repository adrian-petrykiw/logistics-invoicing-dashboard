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

  const { amount, publicKey, partnerUserId } = req.body;

  // Ensure amount is valid before proceeding
  if (amount == null || isNaN(amount)) {
    return res
      .status(400)
      .json({ message: "Amount is required and must be a valid number" });
  }

  try {
    // Store initial transaction data
    await supabase.from("payment_transactions").insert({
      partner_user_id: partnerUserId,
      status: "pending",
      amount: amount.toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const params = new URLSearchParams({
      appId: process.env.COINBASE_APP_ID!,
      addresses: JSON.stringify({
        [publicKey]: ["solana"],
      }),
      assets: JSON.stringify(["USDC"]),
      presetFiatAmount: amount.toString(),
      defaultExperience: "buy",
      defaultPaymentMethod: "CARD",
      fiatCurrency: "USD",
      partnerUserId,
    });

    const url = `https://pay.coinbase.com/buy/select-asset?${params.toString()}`;

    res.status(200).json({ url, partnerUserId });
  } catch (error) {
    console.error("Payment initialization failed:", error);
    res.status(500).json({ message: "Failed to initialize payment" });
  }
}
