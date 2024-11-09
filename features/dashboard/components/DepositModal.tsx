import { useState, useRef, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { initOnRamp, InitOnRampParams } from "@coinbase/cbpay-js";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
} from "@solana/spl-token";
import * as multisig from "@sqds/multisig";
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
import { toast } from "react-hot-toast";
import { solanaService } from "@/services/solana";

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
    if (vaultAddress && usdcAta) {
      console.log("Vault address:", vaultAddress.toBase58());
      console.log("USDC ATA:", usdcAta.toBase58());
    }
  }, [vaultAddress, usdcAta]);

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
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      setUsdcAta(ata);
    };

    initializeAddresses();
  }, [multisigAddress]);

  const initializeAta = async () => {
    if (!vaultAddress || !usdcAta) return;

    const response = await fetch("/api/init-token-ata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vaultAddress: vaultAddress.toBase58(),
        tokenMint: USDC_MINT.toBase58(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to initialize ATA");
    }

    const { signature } = await response.json();
    await solanaService.confirmTransactionWithRetry(signature, "confirmed", 5);
    return signature;
  };

  const checkVaultAndAtaStatus = async () => {
    if (!vaultAddress || !publicKey || !usdcAta) return false;

    try {
      // Get account info first to verify existence
      const vaultInfo = await connection.getAccountInfo(
        vaultAddress,
        "confirmed"
      );
      const userInfo = await connection.getAccountInfo(publicKey, "confirmed");
      const ataInfo = await connection.getAccountInfo(usdcAta, "confirmed");

      const vaultBalance = vaultInfo ? vaultInfo.lamports : 0;
      const userBalance = userInfo ? userInfo.lamports : 0;

      console.log("Vault info exists:", !!vaultInfo);
      console.log("User info exists:", !!userInfo);
      console.log("ATA info exists:", !!ataInfo);
      console.log("Raw vault balance:", vaultBalance);
      console.log("Raw user balance:", userBalance);

      const vaultBalanceSol = vaultBalance / LAMPORTS_PER_SOL;
      const userBalanceSol = userBalance / LAMPORTS_PER_SOL;

      console.log(
        `Current vault ${vaultAddress} SOL balance:`,
        vaultBalanceSol
      );
      console.log(`Current user ${publicKey} SOL balance:`, userBalanceSol);

      // Determine what needs to be initialized
      const needsInitialization =
        vaultBalanceSol < 0.002 || userBalanceSol < 0.001;
      const needsAta = !ataInfo;

      console.log("Needs SOL initialization:", needsInitialization);
      console.log("Needs ATA initialization:", needsAta);

      if (needsInitialization) {
        // Initialize both SOL and ATA in one transaction
        console.log(
          "Initializing vault and creating ATA via init-fund-multisig..."
        );
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
        await solanaService.confirmTransactionWithRetry(
          signature,
          "confirmed",
          5
        );
        console.log("Vault initialized and ATA created:", signature);
      } else if (needsAta) {
        // Only initialize ATA if we have sufficient SOL
        console.log("Creating USDC ATA only...");
        const signature = await initializeAta();
        console.log("USDC ATA created:", signature);
      } else {
        console.log("Vault and ATA are already initialized");
      }

      // Verify final state
      const finalVaultBalance = await connection.getBalance(vaultAddress);
      console.log(
        "Final vault SOL balance:",
        finalVaultBalance / LAMPORTS_PER_SOL
      );

      try {
        const ataAccount = await getAccount(connection, usdcAta);
        console.log("Final ATA state:", ataAccount.address.toBase58());
      } catch (e) {
        console.error("Failed to get final ATA state:", e);
        throw new Error("ATA initialization failed");
      }

      return true;
    } catch (error) {
      console.error("Vault/ATA initialization error:", error);
      throw error;
    }
  };

  const initializeCoinbaseOnramp = async (amount: number) => {
    if (!publicKey || !usdcAta) {
      throw new Error("Required addresses not available");
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

    return new Promise<void>((resolve, reject) => {
      initOnRamp(options, (error, instance) => {
        if (instance) {
          onrampInstance.current = instance;
          onrampInstance.current.open();
          resolve();
        } else {
          reject(error || new Error("Failed to initialize Coinbase OnRamp"));
        }
      });
    });
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
      await checkVaultAndAtaStatus();

      console.log("Vault Address:", vaultAddress);
      const vaultBalance = await connection.getBalance(vaultAddress);
      console.log("Vault USDC Balance:", vaultBalance);

      await initializeCoinbaseOnramp(amount);
    } catch (error) {
      console.error("Deposit error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to deposit");
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="p-0 font-medium text-black hover:bg-transparent hover:text-gray-600 mr-[4px]"
        >
          + ADD FUNDS
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            Add funds to your multisig vault using your debit/credit card.
          </DialogDescription>
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
