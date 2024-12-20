import { useState, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { FiPlus } from "react-icons/fi";
import { initOnRamp, InitOnRampParams } from "@coinbase/cbpay-js";
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
import { PublicKey } from "@solana/web3.js";
import { UseMutationResult, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AuthUser } from "@/types/auth";
import {
  CreateOrganizationInput,
  OrganizationResponse,
  ApiResponse,
} from "@/schemas/organization";
import { CreateMultisigInput } from "@/schemas/squads";
import { getMultisigPda } from "@sqds/multisig";

export interface CreateMultisigResult {
  signature: string;
  multisigPda: PublicKey;
  createKey: PublicKey;
}

interface VendorRegistrationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userInfo: { email: string } | null;
  onSubmitSuccess: () => void;
  createMultisig: UseMutationResult<
    CreateMultisigResult,
    Error,
    CreateMultisigInput,
    unknown
  >;
  createOrganization: UseMutationResult<
    ApiResponse<OrganizationResponse>,
    unknown,
    CreateOrganizationInput,
    unknown
  >;
}

interface RegistrationFormData {
  ownerName: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  registrationNumber: string;
  taxNumber: string;
  amount: number;
  partnerUserId: string;
}

export function VendorRegistrationModal({
  isOpen,
  onOpenChange,
  userInfo,
  onSubmitSuccess,
  createMultisig,
  createOrganization,
}: VendorRegistrationModalProps) {
  const { publicKey, connected, wallet, connect } = useWallet();
  const [step, setStep] = useState<"details" | "processing">("details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formDisabled, setFormDisabled] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const onrampInstance = useRef<any>(null);
  const processingRef = useRef(false);
  const hasExitedRef = useRef(false);

  // Effect to handle wallet reconnection after payment redirect
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;

    if (paymentInitiated && !connected && wallet?.adapter.name === "Particle") {
      reconnectTimeout = setTimeout(async () => {
        try {
          await connect();
        } catch (error) {
          console.error("Wallet reconnection error:", error);
        }
      }, 1000);
    }

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [paymentInitiated, connected, wallet, connect]);

  const resetState = () => {
    setStep("details");
    setIsSubmitting(false);
    setFormDisabled(false);
    setPaymentInitiated(false);
    processingRef.current = false;
    hasExitedRef.current = false;
    localStorage.removeItem("vendorRegistrationData");
  };

  const handlePaymentSuccess = async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    hasExitedRef.current = false;

    try {
      console.log("Payment success callback triggered");
      setStep("processing");

      const storedData = localStorage.getItem("vendorRegistrationData");
      if (!storedData) {
        throw new Error("Registration data not found");
      }
      const formData = JSON.parse(storedData) as RegistrationFormData;

      if (!connected || !publicKey) {
        throw new Error("Wallet not connected");
      }

      let multisigResult;
      try {
        multisigResult = await createMultisig.mutateAsync({
          creator: publicKey,
          email: formData.companyEmail,
          configAuthority: publicKey,
        });
      } catch (error: any) {
        // If error indicates multisig exists, try to get its address
        if (error.message?.includes("already in use")) {
          // const createKey = PublicKey.findProgramAddressSync(
          //   [Buffer.from("squad"), publicKey.toBuffer()],
          //   new PublicKey("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf")
          // )[0];
          const createKey = publicKey;
          const [multisigPda] = getMultisigPda({ createKey });

          multisigResult = {
            signature: "existing",
            multisigPda,
            createKey,
          };
        } else {
          throw error;
        }
      }

      if (!multisigResult?.multisigPda) {
        throw new Error("Failed to get multisig address");
      }

      // Create organization
      const response = await createOrganization.mutateAsync({
        name: formData.companyName,
        multisig_wallet: multisigResult.multisigPda.toBase58(),
        business_details: {
          companyName: formData.companyName,
          companyAddress: formData.companyAddress,
          companyPhone: formData.companyPhone,
          companyEmail: formData.companyEmail,
          companyWebsite: formData.companyWebsite,
          registrationNumber: formData.registrationNumber,
          taxNumber: formData.taxNumber,
          ownerName: formData.ownerName,
          ownerEmail: formData.companyEmail,
          ownerWalletAddress: publicKey.toBase58(),
        },
      });

      console.log("Registration completed successfully", response);
      setPaymentInitiated(false);
      localStorage.removeItem("vendorRegistrationData");
      onOpenChange(false);
      onSubmitSuccess();
      toast.success("Organization registered successfully!");
      resetState();
    } catch (error) {
      console.error("Registration error:", error);
      if (!hasExitedRef.current) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to complete registration"
        );
      }
      setIsSubmitting(false);
      setFormDisabled(false);
      setPaymentInitiated(false);
      processingRef.current = false;
      hasExitedRef.current = false;
    }
  };

  // const handlePaymentSuccess = async () => {
  //   if (processingRef.current) return;
  //   processingRef.current = true;
  //   hasExitedRef.current = false;

  //   try {
  //     console.log("Payment success callback triggered");
  //     setStep("processing");

  //     // Add delay to ensure state is set
  //     await new Promise((resolve) => setTimeout(resolve, 1000));

  //     // Get stored data first
  //     const storedData = localStorage.getItem("vendorRegistrationData");
  //     if (!storedData) {
  //       throw new Error("Registration data not found");
  //     }
  //     const formData = JSON.parse(storedData) as RegistrationFormData;

  //     // Wait for wallet connection
  //     const maxRetries = 5;
  //     let retries = 0;

  //     while (!connected && retries < maxRetries) {
  //       await new Promise((resolve) => setTimeout(resolve, 1000));
  //       retries++;

  //       if (!connected && wallet?.adapter.name === "Particle") {
  //         try {
  //           await connect();
  //         } catch (error) {
  //           console.warn("Reconnection attempt failed:", error);
  //         }
  //       }
  //     }

  //     if (!connected || !publicKey) {
  //       throw new Error("Failed to reconnect wallet after payment");
  //     }

  //     // Create multisig immediately after payment
  //     const multisigResult = await createMultisig.mutateAsync({
  //       creator: publicKey,
  //       email: formData.companyEmail,
  //       configAuthority: publicKey,
  //     });

  //     if (!multisigResult?.multisigPda) {
  //       throw new Error("Failed to create multisig: Invalid result");
  //     }

  //     // Create organization
  //     const response = await createOrganization.mutateAsync({
  //       name: formData.companyName,
  //       multisig_wallet: multisigResult.multisigPda.toBase58(),
  //       business_details: {
  //         companyName: formData.companyName,
  //         companyAddress: formData.companyAddress,
  //         companyPhone: formData.companyPhone,
  //         companyEmail: formData.companyEmail,
  //         companyWebsite: formData.companyWebsite,
  //         registrationNumber: formData.registrationNumber,
  //         taxNumber: formData.taxNumber,
  //         ownerName: formData.ownerName,
  //         ownerEmail: formData.companyEmail,
  //         ownerWalletAddress: publicKey.toBase58(),
  //       },
  //     });

  //     // Success handling
  //     console.log("Registration completed successfully");
  //     setPaymentInitiated(false);
  //     localStorage.removeItem("vendorRegistrationData");
  //     onOpenChange(false);
  //     onSubmitSuccess();
  //     toast.success("Organization registered successfully!");
  //     resetState();
  //   } catch (error) {
  //     console.error("Registration error:", error);
  //     if (!hasExitedRef.current) {
  //       toast.error(
  //         error instanceof Error
  //           ? error.message
  //           : "Failed to complete registration"
  //       );
  //     }
  //     // resetState();
  //     setIsSubmitting(false);
  //     setFormDisabled(false);
  //     setPaymentInitiated(false);
  //     processingRef.current = false;
  //     hasExitedRef.current = false;
  //   }
  // };

  const handleInitialSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!publicKey || !connected) {
      toast.error("Please ensure your wallet is connected");
      return;
    }

    setIsSubmitting(true);
    setFormDisabled(true);

    try {
      const formData = new FormData(e.currentTarget);
      const amount = parseFloat(formData.get("amount") as string);
      const ownerName = formData.get("ownerName") as string;
      const companyName = formData.get("companyName") as string;
      const companyAddress = formData.get("companyAddress") as string;
      const companyPhone = formData.get("companyPhone") as string;
      const companyEmail = formData.get("companyEmail") as string;
      const companyWebsite = formData.get("companyWebsite") as string;
      const registrationNumber = formData.get("registrationNumber") as string;
      const taxNumber = formData.get("taxNumber") as string;

      if (!publicKey) {
        throw new Error("Please connect your wallet first");
      }

      if (amount < 1 || amount > 500) {
        throw new Error("Amount must be between $1 and $500");
      }

      const basePublicKey = publicKey.toBase58();
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const shortPublicKey = basePublicKey.substring(0, 20);
      const partnerUserId = `${shortPublicKey}_${timestamp}`;

      const registrationData: RegistrationFormData = {
        ownerName,
        companyName,
        companyAddress,
        companyPhone,
        companyEmail,
        companyWebsite,
        registrationNumber,
        taxNumber,
        amount,
        partnerUserId,
      };

      localStorage.setItem(
        "vendorRegistrationData",
        JSON.stringify(registrationData)
      );
      setPaymentInitiated(true);

      const options: InitOnRampParams = {
        appId: process.env.NEXT_PUBLIC_COINBASE_APP_ID!,
        widgetParameters: {
          destinationWallets: [
            {
              address:
                process.env.NEXT_PUBLIC_PAYMENT_ADDRESS ||
                "qWsuS2kxGbNxWKabVjJ6LvMgpCe6T5JghpqxDmn5RiJ",
              assets: ["USDC"],
              supportedNetworks: ["solana"],
            },
          ],
          presetCryptoAmount: amount,
          defaultExperience: "buy",
          partnerUserId: partnerUserId,
        },
        onSuccess: handlePaymentSuccess,
        onExit: () => {
          if (!processingRef.current) {
            hasExitedRef.current = true;
            setPaymentInitiated(false);
            toast.error("Payment process was cancelled");
            resetState();
          }
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
          throw new Error("Failed to initialize payment");
        }
      });
    } catch (error) {
      console.error("Payment initialization error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to initialize payment"
      );
      // resetState();
      setIsSubmitting(false);
      setFormDisabled(false);
      setPaymentInitiated(false);
      processingRef.current = false;
      hasExitedRef.current = false;
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!formDisabled && !open) {
          onOpenChange(open);
          if (!open) resetState();
        }
      }}
    >
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => {
          e.preventDefault();
          if (formDisabled) return;
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Register Vendor</DialogTitle>
        </DialogHeader>
        {step === "details" && (
          <form onSubmit={handleInitialSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Your Full Name*</Label>
              <Input name="ownerName" required disabled={formDisabled} />
            </div>
            <div className="space-y-2">
              <Label>Company Name*</Label>
              <Input name="companyName" required disabled={formDisabled} />
            </div>
            <div className="space-y-2">
              <Label>Company Address*</Label>
              <Input name="companyAddress" required disabled={formDisabled} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Email*</Label>
                <Input
                  name="companyEmail"
                  type="email"
                  disabled={formDisabled}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Company Phone</Label>
                <Input name="companyPhone" type="tel" disabled={formDisabled} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Company Website</Label>
              <Input
                name="companyWebsite"
                type="url"
                placeholder="https://example.com"
                disabled={formDisabled}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Registration/Business License #</Label>
                <Input name="registrationNumber" disabled={formDisabled} />
              </div>
              <div className="space-y-2">
                <Label>Tax Number (ie. EIN)</Label>
                <Input name="taxNumber" disabled={formDisabled} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Amount (USDC)*</Label>
              <Input
                name="amount"
                type="number"
                min="10"
                max="500"
                step="0.01"
                placeholder="Enter amount between $10-$500"
                required
                disabled={formDisabled}
              />
            </div>
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground mt-4">
              <p>
                <span className="font-bold">Notice: </span>
                To register as a verified vendor, you must complete a USDC
                payment to add funds to your account between $10-$500. This
                amount minus $10 for initial transaction fees will be added to
                your account credit balance.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || formDisabled}
            >
              {isSubmitting ? "Processing..." : "Register"}
            </Button>
          </form>
        )}
        {step === "processing" && (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p>Registering you as a vendor...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
