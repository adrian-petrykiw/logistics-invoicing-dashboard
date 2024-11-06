import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "./pages/api/_lib/supabase";

export async function middleware(req: NextRequest) {
  const userEmail = req.headers.get("x-user-email");
  const userId = req.headers.get("x-user-id");
  const walletAddress = req.headers.get("x-wallet-address");

  if (!userEmail || !userId || !walletAddress) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    // Get or create user in Supabase
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .upsert({
        particle_user_id: userId,
        email: userEmail,
        wallet_address: walletAddress,
        last_sign_in: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Add user context to request
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-supabase-user-id", user.id);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error("Auth error:", error);
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }
}
