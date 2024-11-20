import { useState, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { initOnRamp, InitOnRampParams } from "@coinbase/cbpay-js";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
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
import { USDC_MINT } from "@/utils/constants";

export function DepositModal() {
  const { publicKey } = useWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const onrampInstance = useRef<any>(null);

  const checkVaultAndAtaStatus = async () => {
    if (!publicKey) {
      console.error("Wallet not connected");
      return { success: false, ata: null, error: "Wallet not connected" };
    }

    try {
      console.log("Starting vault and ATA status check...");
      const createKey = publicKey;
      const [multisigPda] = multisig.getMultisigPda({ createKey });
      const [vaultPda] = multisig.getVaultPda({ multisigPda, index: 0 });

      const ata = await getAssociatedTokenAddress(
        USDC_MINT,
        vaultPda,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      // Log all the addresses for debugging
      console.log("Addresses:", {
        userPublicKey: publicKey.toBase58(),
        multisigPda: multisigPda.toBase58(),
        vaultPda: vaultPda.toBase58(),
        ata: ata.toBase58(),
      });

      const [vaultBalance, userBalance] = await Promise.all([
        solanaService.getBalance(vaultPda, "confirmed"),
        solanaService.getBalance(publicKey, "confirmed"),
      ]);

      const tokenAccount = await solanaService.getSolanaAccount(
        ata,
        "confirmed"
      );
      const ataExists = tokenAccount !== null;

      const vaultBalanceSol = vaultBalance / LAMPORTS_PER_SOL;
      const userBalanceSol = userBalance / LAMPORTS_PER_SOL;

      console.log({
        vaultBalanceSol,
        userBalanceSol,
        ataExists,
        ataAddress: ata.toBase58(),
      });

      const needsInitialization =
        vaultBalanceSol < 0.002 || userBalanceSol < 0.001;
      const needsAta = !ataExists;

      if (needsInitialization || needsAta) {
        console.log("Initializing vault and creating ATA...");
        let initAttempts = 0;
        const maxAttempts = 3;

        while (initAttempts < maxAttempts) {
          try {
            console.log(`Initialization attempt ${initAttempts + 1}`);
            const response = await fetch("/api/init-fund-multisig", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userWallet: publicKey.toBase58(),
                multisigPda: multisigPda.toBase58(),
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Failed to initialize vault");
            }

            const data = await response.json();
            console.log("Init response:", data);

            if (!data.signature) {
              throw new Error("No signature returned from initialization");
            }

            // Wait for initial confirmation
            await new Promise((resolve) => setTimeout(resolve, 1000));

            await solanaService.confirmTransactionWithRetry(
              data.signature,
              "confirmed",
              3,
              30000
            );

            // Additional verification wait
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Verify ATA creation
            const verifyAta = await solanaService.getSolanaAccount(
              ata,
              "confirmed"
            );
            if (verifyAta) {
              console.log("Setup verified successfully");
              return { success: true, ata };
            }

            throw new Error("Setup verification failed");
          } catch (initError: unknown) {
            console.error(
              `Initialization attempt ${initAttempts + 1} failed:`,
              initError
            );
            initAttempts++;

            if (initAttempts === maxAttempts) {
              throw new Error(
                initError instanceof Error
                  ? initError.message
                  : "Failed to initialize"
              );
            }
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }
      }

      return { success: true, ata };
    } catch (error: unknown) {
      console.error("Vault/ATA initialization error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to initialize vault";
      toast.error(errorMessage);
      return { success: false, ata: null, error: errorMessage };
    }
  };

  // const checkVaultAndAtaStatus = async () => {
  //   if (!vaultAddress || !publicKey || !usdcAta) return false;

  //   try {
  //     // Get balances directly instead of checking account info
  //     const [vaultBalance, userBalance] = await Promise.all([
  //       solanaService.getBalance(vaultAddress, "confirmed"),
  //       solanaService.getBalance(publicKey, "confirmed"),
  //     ]);

  //     // Check ATA existence using getAccount which is specific for token accounts
  //     let ataExists = false;
  //     try {
  //       await solanaService.getAccount(usdcAta, "confirmed");
  //       ataExists = true;
  //     } catch (e) {
  //       if (e instanceof TokenAccountNotFoundError) {
  //         ataExists = false;
  //       } else {
  //         throw e;
  //       }
  //     }

  //     const vaultBalanceSol = vaultBalance / LAMPORTS_PER_SOL;
  //     const userBalanceSol = userBalance / LAMPORTS_PER_SOL;

  //     console.log("Vault balance (SOL) lamports:", vaultBalanceSol);
  //     console.log("User balance (SOL) lamports:", userBalanceSol);

  //     console.log("Vault balance (SOL):", vaultBalance);
  //     console.log("User balance (SOL):", userBalance);

  //     console.log("ATA exists:", ataExists);

  //     // Adjust these thresholds based on your needs
  //     const needsInitialization =
  //       vaultBalanceSol < 0.002 || userBalanceSol < 0.001;
  //     const needsAta = !ataExists;

  //     if (needsInitialization) {
  //       console.log(
  //         "Initializing vault and creating ATA via init-fund-multisig..."
  //       );
  //       const response = await fetch("/api/init-fund-multisig", {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({
  //           userWallet: publicKey.toBase58(),
  //           multisigPda: localMultisigPDA,
  //         }),
  //       });

  //       if (!response.ok) {
  //         const error = await response.json();
  //         throw new Error(error.error || "Failed to initialize vault");
  //       }

  //       const { signature } = await response.json();
  //       await solanaService.confirmTransactionWithRetry(
  //         signature,
  //         "confirmed",
  //         5
  //       );
  //       console.log("Vault initialized and ATA created:", signature);
  //     } else if (needsAta) {
  //       console.log("Creating USDC ATA only...");
  //       const signature = await initializeAta();
  //       console.log("USDC ATA created:", signature);
  //     } else {
  //       console.log("Vault and ATA are already initialized");
  //     }

  //     // Verify final state
  //     const finalVaultBalance = await solanaService.getBalance(vaultAddress);
  //     console.log(
  //       "Final vault SOL balance:",
  //       finalVaultBalance / LAMPORTS_PER_SOL
  //     );

  //     const finalAtaState = await solanaService.getAccount(
  //       usdcAta,
  //       "confirmed"
  //     );
  //     console.log("Final ATA state:", finalAtaState.address.toBase58());

  //     return true;
  //   } catch (error) {
  //     console.error("Vault/ATA initialization error:", error);
  //     throw error;
  //   }
  // };

  const initializeCoinbaseOnramp = async (ata: PublicKey, amount: number) => {
    if (!publicKey) {
      throw new Error("Wallet not connected");
    }

    const partnerUserId = `${publicKey
      .toBase58()
      .substring(0, 20)}_${Date.now()}`;

    const options: InitOnRampParams = {
      appId: process.env.NEXT_PUBLIC_COINBASE_APP_ID!,
      widgetParameters: {
        destinationWallets: [
          {
            address: ata.toBase58(),
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
        console.log("Deposit process was exited");
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

    try {
      const data = new FormData(e.currentTarget);
      const amount = parseFloat(data.get("amount") as string);

      if (!publicKey) {
        throw new Error("Wallet not connected");
      }

      if (amount < 1 || amount > 500) {
        throw new Error("Amount must be between $1 and $500");
      }

      const result = await checkVaultAndAtaStatus();
      if (!result.success || !result.ata) {
        throw new Error(result.error || "Failed to initialize vault");
      }

      await initializeCoinbaseOnramp(result.ata, amount);
    } catch (error) {
      console.error("Deposit error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to deposit");
      setIsSubmitting(false);
      setIsOpen(false);
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
            disabled={isSubmitting || !publicKey}
          >
            {isSubmitting ? "Processing..." : "Deposit"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
