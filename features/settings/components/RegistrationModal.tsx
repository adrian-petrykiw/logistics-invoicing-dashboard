import { useState, useRef } from "react";
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
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AuthUser } from "@/types/auth";
import {
  CreateOrganizationInput,
  OrganizationResponse,
  ApiResponse,
} from "@/schemas/organization";
import { CreateMultisigInput } from "@/schemas/squads";

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

export function VendorRegistrationModal({
  isOpen,
  onOpenChange,
  userInfo,
  onSubmitSuccess,
  createMultisig,
  createOrganization,
}: VendorRegistrationModalProps) {
  const { publicKey } = useWallet();
  const [step, setStep] = useState<"details" | "processing">("details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formDisabled, setFormDisabled] = useState(false);
  const onrampInstance = useRef<any>(null);
  const queryClient = useQueryClient();
  const processingRef = useRef(false);
  const hasExitedRef = useRef(false);

  const resetState = () => {
    setStep("details");
    setIsSubmitting(false);
    setFormDisabled(false);
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

      await queryClient.refetchQueries({ queryKey: ["auth"] });

      const startTime = Date.now();
      const timeout = 10000;
      let currentUser: AuthUser | null = null;

      while (Date.now() - startTime < timeout) {
        const userData = queryClient.getQueryData<AuthUser | null>(["auth"]);
        if (userData) {
          currentUser = userData;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
        await queryClient.refetchQueries({ queryKey: ["auth"] });
      }

      if (!currentUser || !publicKey) {
        throw new Error("Authentication failed after payment");
      }

      console.log("Auth verified, proceeding with registration");

      const storedData = localStorage.getItem("vendorRegistrationData");
      if (!storedData) {
        throw new Error("Registration data not found");
      }
      const formData = JSON.parse(storedData);

      // Create multisig and organization
      const { multisigPda } = await createMultisig.mutateAsync({
        creator: publicKey,
        email: currentUser.email,
        configAuthority: publicKey,
      });

      const response = await createOrganization.mutateAsync({
        name: formData.companyName,
        multisig_wallet: multisigPda.toBase58(),
        business_details: {
          companyName: formData.companyName,
          companyAddress: formData.companyAddress,
          companyPhone: formData.companyPhone,
          companyEmail: formData.companyEmail,
          companyWebsite: formData.companyWebsite,
          registrationNumber: formData.registrationNumber,
          taxNumber: formData.taxNumber,
          ownerName: formData.ownerName,
          ownerEmail: currentUser.email,
          ownerWalletAddress: publicKey.toBase58(),
        },
      });

      if (!response.success || !response.data) {
        throw new Error(
          response.error?.error || "Failed to create organization"
        );
      }

      console.log("Registration completed successfully");
      localStorage.removeItem("vendorRegistrationData");
      onOpenChange(false);
      onSubmitSuccess();
      toast.success("Organization registered successfully!");
      resetState();
    } catch (error) {
      console.error("Registration error:", error);
      if (!hasExitedRef.current) {
        toast.error("Failed to complete registration. Please try again.");
      }
      resetState();
    }
  };

  const handleInitialSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormDisabled(true);

    const data = new FormData(e.currentTarget);
    const amount = parseFloat(data.get("amount") as string);
    const ownerName = data.get("ownerName") as string;
    const companyName = data.get("companyName") as string;
    const companyAddress = data.get("companyAddress") as string;
    const companyPhone = data.get("companyPhone") as string;
    const companyEmail = data.get("companyEmail") as string;
    const companyWebsite = data.get("companyWebsite") as string;
    const registrationNumber = data.get("registrationNumber") as string;
    const taxNumber = data.get("taxNumber") as string;

    if (!publicKey) {
      toast.error("Please connect your wallet first");
      resetState();
      return;
    }

    if (amount < 1 || amount > 500) {
      toast.error("Amount must be between $1 and $500");
      resetState();
      return;
    }

    try {
      const basePublicKey = publicKey.toBase58();
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const shortPublicKey = basePublicKey.substring(0, 20);
      const partnerUserId = `${shortPublicKey}_${timestamp}`;

      const registrationData = {
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
          toast.error("Failed to initialize payment");
          resetState();
        }
      });
    } catch (error) {
      console.error("Payment initialization error:", error);
      toast.error("Failed to initialize payment");
      resetState();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!formDisabled) {
          onOpenChange(open);
          if (!open) resetState();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <FiPlus /> Register Vendor
        </Button>
      </DialogTrigger>

      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-describedby="registration-form-description"
      >
        <DialogHeader>
          <DialogTitle>Register Vendor</DialogTitle>
          {/* <p
            id="registration-form-description"
            className="text-sm text-muted-foreground"
          >
            Fill out the form below to register your organization.
          </p> */}
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
                min="1"
                max="500"
                step="0.01"
                placeholder="Enter amount between $1-$500"
                required
                disabled={formDisabled}
              />
            </div>
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground mt-4">
              <p>
                <span className="font-bold">Notice: </span>
                To register as a verified vendor, you must complete a USDC
                payment between $1-$500 with your debit/credit card. This amount
                will be added to your credit balance.
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
