// hooks/usePayment.ts
import { useState } from "react";

export interface PaymentStatus {
  status: "pending" | "completed" | "failed";
  amount?: string;
  tx_hash?: string;
  wallet_address?: string;
}

export function usePayment() {
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPaymentStatus = async (
    partnerUserId: string
  ): Promise<boolean> => {
    setIsChecking(true);
    setError(null);

    try {
      // Poll payment status every 3 seconds for up to 5 minutes
      const maxAttempts = 100;
      let attempts = 0;

      while (attempts < maxAttempts) {
        // Check payment status via API route
        const response = await fetch(
          `/api/payment/status?partnerUserId=${partnerUserId}`
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: "API request failed" }));
          throw new Error(
            errorData.message || "Failed to check payment status"
          );
        }

        const data = await response.json();

        if (data.status === "ONRAMP_TRANSACTION_STATUS_SUCCESS") {
          await fetch("/api/payment/update-status", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              partnerUserId,
              status: "completed",
              amount: data.amount,
              tx_hash: data.tx_hash,
              wallet_address: data.wallet_address,
            }),
          });
          return true;
        }

        if (data.status === "ONRAMP_TRANSACTION_STATUS_FAILED") {
          await fetch("/api/payment/update-status", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              partnerUserId,
              status: "failed",
            }),
          });
          return false;
        }

        // Wait 3 seconds before next check
        await new Promise((resolve) => setTimeout(resolve, 3000));
        attempts++;
      }

      // Timeout - mark as failed
      await fetch("/api/payment/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partnerUserId,
          status: "failed",
        }),
      });
      setError("Payment verification timed out");
      return false;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Payment status check failed:", errorMessage);
      setError(errorMessage);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  const initializePayment = async (amount: number, publicKey: string) => {
    const partnerUserId = `${publicKey.slice(0, 15)}_${Date.now()}`.slice(
      0,
      49
    );

    // Initialize payment via API route
    const response = await fetch("/api/payment/initialize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        publicKey,
        partnerUserId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to initialize payment");
    }

    return {
      url: data.url,
      partnerUserId: data.partnerUserId,
    };
  };

  return {
    checkPaymentStatus,
    initializePayment,
    isChecking,
  };
}
