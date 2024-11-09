import { useState, useRef, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { initOnRamp, InitOnRampParams } from "@coinbase/cbpay-js";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  TokenAccountNotFoundError,
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

export function DepositModal() {
  const { publicKey } = useWallet();

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vaultAddress, setVaultAddress] = useState<PublicKey | null>(null);
  const [localMultisigPDA, setLocalMultisigPDA] = useState<PublicKey | null>(
    null
  );
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
      const createKey = PublicKey.findProgramAddressSync(
        [Buffer.from("squad"), publicKey!.toBuffer()],
        new PublicKey("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf")
      )[0];

      const [multisigPda] = multisig.getMultisigPda({
        createKey: createKey,
      });

      // Get vault PDA (index 0 is the default vault)
      const [vaultPda] = multisig.getVaultPda({
        multisigPda,
        index: 0,
      });
      setVaultAddress(vaultPda);
      setLocalMultisigPDA(multisigPda);

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
  }, []);

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
      // Get balances directly instead of checking account info
      const [vaultBalance, userBalance] = await Promise.all([
        solanaService.getBalance(vaultAddress, "confirmed"),
        solanaService.getBalance(publicKey, "confirmed"),
      ]);

      // Check ATA existence using getAccount which is specific for token accounts
      let ataExists = false;
      try {
        await solanaService.getAccount(usdcAta, "confirmed");
        ataExists = true;
      } catch (e) {
        if (e instanceof TokenAccountNotFoundError) {
          ataExists = false;
        } else {
          throw e;
        }
      }

      const vaultBalanceSol = vaultBalance / LAMPORTS_PER_SOL;
      const userBalanceSol = userBalance / LAMPORTS_PER_SOL;

      console.log("Vault balance (SOL) lamports:", vaultBalanceSol);
      console.log("User balance (SOL) lamports:", userBalanceSol);

      console.log("Vault balance (SOL):", vaultBalance);
      console.log("User balance (SOL):", userBalance);

      console.log("ATA exists:", ataExists);

      // Adjust these thresholds based on your needs
      const needsInitialization =
        vaultBalanceSol < 0.002 || userBalanceSol < 0.001;
      const needsAta = !ataExists;

      if (needsInitialization) {
        console.log(
          "Initializing vault and creating ATA via init-fund-multisig..."
        );
        const response = await fetch("/api/init-fund-multisig", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userWallet: publicKey.toBase58(),
            multisigPda: localMultisigPDA,
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
        console.log("Creating USDC ATA only...");
        const signature = await initializeAta();
        console.log("USDC ATA created:", signature);
      } else {
        console.log("Vault and ATA are already initialized");
      }

      // Verify final state
      const finalVaultBalance = await solanaService.getBalance(vaultAddress);
      console.log(
        "Final vault SOL balance:",
        finalVaultBalance / LAMPORTS_PER_SOL
      );

      const finalAtaState = await solanaService.getAccount(
        usdcAta,
        "confirmed"
      );
      console.log("Final ATA state:", finalAtaState.address.toBase58());

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
      const vaultBalance = await solanaService.getBalance(vaultAddress);
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
