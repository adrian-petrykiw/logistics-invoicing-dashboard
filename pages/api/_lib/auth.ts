// pages/api/_lib/auth.ts
import { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "./supabase";

export interface AuthedRequest extends NextApiRequest {
  user: {
    id: string;
    email: string;
    walletAddress: string;
    particleUserId: string;
  };
}

export async function getOrCreateUser(req: NextApiRequest) {
  const userEmail = req.headers["x-user-email"] as string;
  const userInfo = req.headers["x-user-info"];
  const walletAddress = req.headers["x-wallet-address"] as string;

  // console.log("Auth Headers:", {
  //   userEmail,
  //   userInfo,
  //   walletAddress,
  //   allHeaders: req.headers,
  // });

  if (!userEmail || !walletAddress) {
    return null;
  }

  try {
    const parsedUserInfo = userInfo ? JSON.parse(userInfo as string) : null;
    const particleUserId =
      parsedUserInfo?.uuid || parsedUserInfo?.particle_user_id;

    if (!particleUserId) {
      throw new Error("No particle user ID found");
    }

    // First try to get the user
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select()
      .eq("email", userEmail)
      .single();

    if (existingUser) {
      // Update existing user
      const { data: updatedUser, error: updateError } = await supabaseAdmin
        .from("users")
        .update({
          wallet_address: walletAddress,
          last_sign_in: new Date().toISOString(),
        })
        .eq("id", existingUser.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return {
        id: updatedUser.id,
        email: userEmail,
        walletAddress,
        particleUserId,
      };
    }

    // Create new user if doesn't exist
    const { data: newUser, error: createError } = await supabaseAdmin
      .from("users")
      .insert({
        email: userEmail,
        wallet_address: walletAddress,
        particle_user_id: particleUserId,
        last_sign_in: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) throw createError;

    return {
      id: newUser.id,
      email: userEmail,
      walletAddress,
      particleUserId,
    };
  } catch (error) {
    console.error("Auth error:", error);
    return null;
  }
}

export function withAuth<T>(
  handler: (
    req: AuthedRequest,
    res: NextApiResponse<T | { error: string }>
  ) => Promise<void>
) {
  return async (
    req: NextApiRequest,
    res: NextApiResponse<T | { error: string }>
  ): Promise<void> => {
    console.log("=== Auth Middleware Start ===");
    console.log("Incoming headers:", {
      email: req.headers["x-user-email"],
      wallet: req.headers["x-wallet-address"],
      info: req.headers["x-user-info"],
    });

    const user = await getOrCreateUser(req);

    console.log("Auth result:", {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      userWallet: user?.walletAddress,
    });

    if (!user) {
      console.log("Auth failed - no user returned");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    (req as AuthedRequest).user = user;

    console.log("=== Auth Middleware End ===");
    return handler(req as AuthedRequest, res);
  };
}
