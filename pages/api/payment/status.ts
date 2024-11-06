// pages/api/payment/status.ts
import { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

// Helper to generate HMAC signature
function generateHmacSignature(
  timestamp: string,
  method: string,
  requestPath: string,
  body: string = ""
) {
  const message = timestamp + method + requestPath + body;
  const key = process.env.COINBASE_CDP_API_SECRET!;
  return crypto.createHmac("sha256", key).update(message).digest("hex");
}

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
    // Format the request path properly
    const requestPath = `/onramp/v1/buy/user/${partnerUserId}/transactions`;
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Generate the signature using HMAC
    const signature = generateHmacSignature(timestamp, "GET", requestPath);

    // Log request details for debugging
    console.log("Making CDP API request:", {
      fullUrl: `https://api.developer.coinbase.com${requestPath}?page_size=1`,
      headers: {
        "CB-ACCESS-KEY": process.env.COINBASE_CDP_API_KEY,
        "CB-ACCESS-SIGN": signature,
        "CB-ACCESS-TIMESTAMP": timestamp,
        "CB-VERSION": "2022-03-01",
        Accept: "application/json",
      },
    });

    const response = await fetch(
      `https://api.developer.coinbase.com${requestPath}?page_size=1`,
      {
        method: "GET",
        headers: {
          "CB-ACCESS-KEY": process.env.COINBASE_CDP_API_KEY!,
          "CB-ACCESS-SIGN": signature,
          "CB-ACCESS-TIMESTAMP": timestamp,
          "CB-VERSION": "2022-03-01",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("CDP API Error Response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText,
      });

      return res.status(response.status).json({
        error: "Failed to fetch transaction status",
        details: errorText,
      });
    }

    const data = await response.json();

    // Get the most recent transaction
    const latestTransaction = data.transactions?.[0];

    if (!latestTransaction) {
      return res.status(200).json({
        status: "ONRAMP_TRANSACTION_STATUS_PENDING",
        amount: "0",
      });
    }

    res.status(200).json({
      status: latestTransaction.status,
      amount: latestTransaction.purchase_amount?.value || "0",
      tx_hash: latestTransaction.tx_hash,
      wallet_address: latestTransaction.wallet_address,
    });
  } catch (error) {
    console.error("Transaction status check failed:", error);
    res.status(500).json({
      message: "Failed to check transaction status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
