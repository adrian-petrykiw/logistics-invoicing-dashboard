import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../_lib/supabase";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { id, updates } = req.body;

    const { data, error } = await supabaseAdmin
      .from("payment_requests")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ data });
  } catch (error) {
    console.error("Failed to modify payment request:", error);
    return res.status(500).json({ error: "Failed to modify payment request" });
  }
}
