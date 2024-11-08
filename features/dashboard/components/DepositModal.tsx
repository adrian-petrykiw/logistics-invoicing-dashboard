import { useState, useRef, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { initOnRamp, InitOnRampParams } from "@coinbase/cbpay-js";
import { PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as multisig from "@sqds/multisig";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";

interface DepositModalProps {
  multisigAddress: string;
}

export function DepositModal({ multisigAddress }: DepositModalProps) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vaultAddress, setVaultAddress] = useState<PublicKey | null>(null);
  const [usdcAta, setUsdcAta] = useState<PublicKey | null>(null);
  const onrampInstance = useRef<any>(null);

  // USDC mint on Solana
  const USDC_MINT = new PublicKey(
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
  );

  useEffect(() => {
    const initializeAddresses = async () => {
      if (!multisigAddress) return;

      const multisigPda = new PublicKey(multisigAddress);

      // Get vault PDA (index 0 is the default vault)
      const [vaultPda] = multisig.getVaultPda({
        multisigPda,
        index: 0,
      });
      setVaultAddress(vaultPda);

      // Get the vault's USDC ATA
      const ata = await getAssociatedTokenAddress(
        USDC_MINT,
        vaultPda,
        true, // allowOwnerOffCurve
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      setUsdcAta(ata);
    };

    initializeAddresses();
  }, [multisigAddress]);

  const checkAndInitializeVault = async () => {
    if (!vaultAddress || !publicKey) return false;

    try {
      const vaultBalance = await connection.getBalance(vaultAddress);
      const userBalance = await connection.getBalance(publicKey);

      // If vault or user needs SOL, call the initialization endpoint
      if (vaultBalance === 0 || userBalance < 0.001 * 1e9) {
        const response = await fetch("/api/init-fund-multisig", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userWallet: publicKey.toBase58(),
            multisigPda: multisigAddress,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to initialize vault");
        }

        const { signature } = await response.json();
        await connection.confirmTransaction(signature);
        console.log("Vault initialized:", signature);
      }

      return true;
    } catch (error) {
      console.error("Vault initialization error:", error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const data = new FormData(e.currentTarget);
    const amount = parseFloat(data.get("amount") as string);

    if (!publicKey || !vaultAddress || !usdcAta) {
      toast.error("Wallet not connected or vault not initialized");
      setIsSubmitting(false);
      return;
    }

    if (amount < 1 || amount > 500) {
      toast.error("Amount must be between $1 and $500");
      setIsSubmitting(false);
      return;
    }

    try {
      // Check and initialize vault if needed
      const isVaultReady = await checkAndInitializeVault();
      if (!isVaultReady) {
        throw new Error("Failed to initialize vault");
      }

      const partnerUserId = `${publicKey
        .toBase58()
        .substring(0, 20)}_${Date.now()}`;

      const options: InitOnRampParams = {
        appId: process.env.NEXT_PUBLIC_COINBASE_APP_ID!,
        widgetParameters: {
          destinationWallets: [
            {
              address: usdcAta.toBase58(),
              assets: ["USDC"],
              supportedNetworks: ["solana"],
            },
          ],
          presetCryptoAmount: amount,
          defaultExperience: "buy",
          partnerUserId,
        },
        onSuccess: () => {
          toast.success("Deposit successful!");
          setIsOpen(false);
          setIsSubmitting(false);
        },
        onExit: () => {
          toast.error("Deposit process was cancelled");
          setIsSubmitting(false);
        },
        experienceLoggedIn: "popup",
        experienceLoggedOut: "popup",
        closeOnExit: true,
        closeOnSuccess: true,
      };

      initOnRamp(options, (error, instance) => {
        if (instance) {
          onrampInstance.current = instance;
          onrampInstance.current.open();
        } else {
          console.error("Failed to initialize Coinbase OnRamp:", error);
          toast.error("Failed to initialize payment");
          setIsSubmitting(false);
        }
      });
    } catch (error) {
      console.error("Payment initialization error:", error);
      toast.error("Failed to initialize payment");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="p-0 font-medium text-black hover:bg-transparent hover:text-gray-600"
        >
          + ADD FUNDS
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Amount (USDC)*</Label>
            <Input
              name="amount"
              type="number"
              min="1"
              max="500"
              step="0.01"
              placeholder="Enter amount between $1-$500"
              required
            />
          </div>

          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            <p>Deposit between $1-$500 USDC using your debit/credit card.</p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !vaultAddress || !usdcAta}
          >
            {isSubmitting ? "Processing..." : "Deposit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
