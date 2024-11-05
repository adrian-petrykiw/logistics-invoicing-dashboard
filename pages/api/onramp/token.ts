// pages/api/onramp/token.ts
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  if (!process.env.COINBASE_APP_ID) {
    return res.status(500).json({ message: "Missing Coinbase app ID" });
  }

  if (!process.env.LP_SQUADS_ADDRESS) {
    return res.status(500).json({ message: "Missing LP Squads address" });
  }

  try {
    // Get the wallet address from the request if needed for tracking
    const { walletAddress } = req.body;

    // Generate URL with all necessary parameters
    const onrampUrl =
      `https://pay.coinbase.com/buy/select-asset?` +
      `appId=${process.env.COINBASE_APP_ID}` +
      `&addresses={"${process.env.LP_SQUADS_ADDRESS}":["solana"]}` +
      `&assets=["USDC"]` +
      `&presetFiatAmount=1` +
      `&defaultExperience=buy` +
      `&defaultPaymentMethod=CARD` +
      `&partnerUserId=${walletAddress}`;

    return res.status(200).json({ onrampUrl });
  } catch (error: any) {
    console.error("Error generating onramp URL:", error);
    return res.status(500).json({
      message: "Failed to generate onramp URL",
      error: error.message,
    });
  }
}
