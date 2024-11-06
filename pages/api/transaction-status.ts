// pages/api/transaction-status.ts
import { NextApiRequest, NextApiResponse } from "next";
import { createHmac } from "crypto";

// Helper to generate CDP signature
const signRequest = (timestamp: string, method: string, path: string) => {
  const message = timestamp + method + path;
  const signature = createHmac("sha256", process.env.COINBASE_CDP_API_SECRET!)
    .update(message)
    .digest("hex");
  return signature;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { partnerUserId } = req.query;

  if (!partnerUserId || typeof partnerUserId !== "string") {
    return res.status(400).json({ message: "Partner User ID is required" });
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const path = `/onramp/v1/buy/user/${partnerUserId}/transactions`;
    const signature = signRequest(timestamp, "GET", path);

    const response = await fetch(
      `https://api.developer.coinbase.com${path}?page_size=1`,
      {
        headers: {
          "CB-ACCESS-KEY": process.env.COINBASE_CDP_API_KEY!,
          "CB-ACCESS-TIMESTAMP": timestamp,
          "CB-ACCESS-SIGNATURE": signature,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch transaction status");
    }

    // Get the most recent transaction
    const latestTransaction = data.transactions[0];

    const status = latestTransaction
      ? {
          status: latestTransaction.status,
          amount: latestTransaction.purchase_amount?.value || "0",
          tx_hash: latestTransaction.tx_hash,
          wallet_address: latestTransaction.wallet_address,
        }
      : {
          status: "PENDING",
          amount: "0",
        };

    res.status(200).json(status);
  } catch (error) {
    console.error("Transaction status check failed:", error);
    res.status(500).json({ message: "Failed to check transaction status" });
  }
}
