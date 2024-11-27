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

  if (!userEmail || !walletAddress) {
    console.error("Missing required headers:", {
      hasEmail: !!userEmail,
      hasWallet: !!walletAddress,
    });
    return null;
  }

  try {
    const parsedUserInfo = userInfo ? JSON.parse(userInfo as string) : null;
    const particleUserId =
      parsedUserInfo?.uuid || parsedUserInfo?.particle_user_id;

    if (!particleUserId) {
      console.error("No particle user ID found in user info:", parsedUserInfo);
      throw new Error("No particle user ID found");
    }

    // First try to get the user
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from("users")
      .select()
      .eq("email", userEmail)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // Not found error code
      console.error("Error fetching user:", fetchError);
      throw fetchError;
    }

    if (existingUser) {
      console.log("Updating existing user:", existingUser.id);
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

      if (updateError) {
        console.error("Error updating user:", updateError);
        throw updateError;
      }

      console.log("User updated successfully:", updatedUser.id);
      return {
        id: updatedUser.id,
        email: userEmail,
        walletAddress,
        particleUserId,
      };
    }

    console.log("Creating new user with email:", userEmail);
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

    if (createError) {
      console.error("Error creating user:", createError);
      throw createError;
    }

    console.log("New user created successfully:", newUser.id);
    return {
      id: newUser.id,
      email: userEmail,
      walletAddress,
      particleUserId,
    };
  } catch (error) {
    console.error("Auth error:", {
      message: error instanceof Error ? error.message : "Unknown error",
      error,
    });
    return null;
  }
}

export function withAuth<T>(
  handler: (
    req: AuthedRequest,
    res: NextApiResponse<T | { error: string; code?: string; details?: string }>
  ) => Promise<void>
) {
  return async (
    req: NextApiRequest,
    res: NextApiResponse<T | { error: string; code?: string; details?: string }>
  ): Promise<void> => {
    console.log("=== Auth Middleware Start ===");
    console.log("Request path:", req.url);
    console.log("Request method:", req.method);
    console.log("Incoming headers:", {
      email: req.headers["x-user-email"],
      wallet: req.headers["x-wallet-address"],
      hasUserInfo: !!req.headers["x-user-info"],
    });

    try {
      const user = await getOrCreateUser(req);

      console.log("Auth result:", {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        userWallet: user?.walletAddress,
      });

      if (!user) {
        console.log("Auth failed - no user returned");
        res.status(401).json({
          error: "Unauthorized",
          code: "AUTH_FAILED",
          details: "User authentication failed",
        });
        return;
      }

      (req as AuthedRequest).user = user;

      console.log("=== Auth Middleware End ===");
      return handler(req as AuthedRequest, res);
    } catch (error) {
      console.error("Auth middleware error:", error);
      res.status(500).json({
        error: "Authentication failed",
        code: "AUTH_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      });
      return;
    }
  };
}
