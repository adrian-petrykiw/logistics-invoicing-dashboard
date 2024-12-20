import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { partnerUserId } = req.query;

  if (!partnerUserId || typeof partnerUserId !== "string") {
    return res.status(400).json({ error: "Partner user ID is required" });
  }

  try {
    const response = await fetch(
      `https://api.developer.coinbase.com/onramp/v1/sell/user/${partnerUserId}/transactions?page_size=1`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-CC-Api-Key": process.env.COINBASE_API_KEY!,
          "X-CC-Version": "2024-02-16",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch transaction status");
    }

    const data = await response.json();
    const latestTransaction = data.transactions[0];

    return res.status(200).json({
      status: latestTransaction?.status || "TRANSACTION_STATUS_PENDING",
      transaction: latestTransaction,
    });
  } catch (error) {
    console.error("Error fetching offramp status:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch transaction status" });
  }
}
