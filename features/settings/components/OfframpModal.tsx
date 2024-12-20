import { useState, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { FiArrowUpRight } from "react-icons/fi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import type { InvalidateQueryFilters } from "@tanstack/react-query";
import { USDC_MINT } from "@/utils/constants";

interface OfframpModalProps {
  multisigWallet?: string;
  balance?: number;
  disabled?: boolean;
}

export function OfframpModal({
  multisigWallet,
  balance = 0,
  disabled,
}: OfframpModalProps) {
  const { publicKey, connected } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [offrampUrl, setOfframpUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Validate amount is not more than balance and meets minimum requirement
  const validateAmount = (amount: number) => {
    if (amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }
    if (amount > balance) {
      throw new Error("Amount cannot exceed your balance");
    }
    if (amount < 1) {
      throw new Error("Minimum offramp amount is 1 USDC");
    }
  };

  // Get the squad vault address for the multisig
  const getVaultAddress = async () => {
    if (!multisigWallet) {
      throw new Error("Multisig wallet address is required");
    }

    const multisigPda = new PublicKey(multisigWallet);
    const [vaultPda] = multisig.getVaultPda({ multisigPda, index: 0 });
    const ata = await getAssociatedTokenAddress(USDC_MINT, vaultPda, true);

    return ata;
  };

  // Initialize the offramp process
  const initializeOfframp = async (amount: number) => {
    try {
      setIsLoading(true);

      if (!publicKey || !connected) {
        throw new Error("Wallet not connected");
      }

      // Get the vault address to send from
      const vaultAddress = await getVaultAddress();

      // Generate a unique partner user ID
      const basePublicKey = publicKey.toBase58();
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const shortPublicKey = basePublicKey.substring(0, 20);
      const partnerUserId = `${shortPublicKey}_${timestamp}`;

      // Create the offramp URL with required parameters
      const params = new URLSearchParams({
        appId: process.env.NEXT_PUBLIC_COINBASE_APP_ID!,
        partnerUserId,
        addresses: JSON.stringify({
          [vaultAddress.toBase58()]: ["solana"],
        }),
        redirectUrl: `${window.location.origin}/settings`,
        defaultNetwork: "solana",
        defaultAsset: "USDC",
        presetCryptoAmount: amount.toString(),
        defaultCashoutMethod: "ACH_BANK_ACCOUNT",
        fiatCurrency: "USD",
      });

      const url = `https://pay.coinbase.com/v3/sell/input?${params.toString()}`;
      setOfframpUrl(url);

      // Poll for transaction status
      const pollStatus = setInterval(async () => {
        try {
          const response = await fetch(
            `/api/offramp-status?partnerUserId=${partnerUserId}`
          );
          const data = await response.json();

          if (data.status === "TRANSACTION_STATUS_SUCCESS") {
            clearInterval(pollStatus);
            toast.success("Offramp successful!");
            setIsOpen(false);
            // Invalidate queries to refresh balances
            queryClient.invalidateQueries({ queryKey: ["balances"] });
          } else if (data.status === "TRANSACTION_STATUS_FAILED") {
            clearInterval(pollStatus);
            toast.error("Offramp failed. Please try again.");
          }
        } catch (error) {
          console.error("Error polling status:", error);
        }
      }, 5000);

      // Clean up interval after 15 minutes (offramp timeout)
      setTimeout(() => {
        clearInterval(pollStatus);
      }, 15 * 60 * 1000);
    } catch (error) {
      console.error("Offramp error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to initialize offramp"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get("amount") as string);

    try {
      validateAmount(amount);
      await initializeOfframp(amount);
    } catch (error) {
      console.error("Submit error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to process request"
      );
    }
  };

  // When offrampUrl is set, open it in a new window
  useEffect(() => {
    if (offrampUrl) {
      window.open(offrampUrl, "_blank");
      setOfframpUrl(null);
    }
  }, [offrampUrl]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="font-medium text-black hover:bg-transparent hover:text-error mr-[-4px] pr-0"
          disabled={disabled || !connected || balance <= 0}
        >
          WITHDRAW FUNDS
          <FiArrowUpRight className="ml-[-4px] mb-[1px]"></FiArrowUpRight>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw Funds</DialogTitle>
          <DialogDescription>
            Convert your funds to fiat and offramp them to your selected method
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Available Balance</Label>
            <Input
              value={`${balance.toFixed(2)} USDC`}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label>Amount*</Label>
            <Input
              name="amount"
              type="number"
              min="1"
              max={balance}
              step="0.01"
              placeholder="Enter amount of USDC to withdraw"
              required
              disabled={isLoading}
            />
          </div>

          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            Note: You'll be redirected to a local offramp to complete your
            withdrawal. Funds will be sent to your connected bank account via
            the selected method in the offramp. Min. withdrawal is 1 USDC.{" "}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !connected || balance <= 0}
          >
            {isLoading ? "Processing..." : "Confirm"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
