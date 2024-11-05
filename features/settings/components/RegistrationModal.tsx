import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { FiPlus } from "react-icons/fi";
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
import axios from "axios";
import { PublicKey } from "@solana/web3.js";
import { UseMutationResult } from "@tanstack/react-query";

interface CreateMultisigResult {
  multisigPda: PublicKey;
}

interface CreateOrganizationData {
  name: string;
  multisig_wallet: string;
  owner_name: string;
  owner_email: string;
  owner_wallet_address: string;
  business_details: {
    companyName: string;
    companyAddress?: string;
    companyPhone?: string;
    companyEmail?: string;
  };
}

interface VendorRegistrationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userInfo: { email: string } | null;
  onSubmitSuccess: () => void;
  createMultisig: UseMutationResult<
    CreateMultisigResult,
    unknown,
    {
      creator: PublicKey;
      email: string;
      configAuthority: PublicKey;
    },
    unknown
  >;
  createOrganization: UseMutationResult<
    unknown,
    unknown,
    CreateOrganizationData,
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
  const [step, setStep] = useState<"details" | "payment" | "processing">(
    "details"
  );
  const [formData, setFormData] = useState<FormData | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInitialSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const data = new FormData(e.currentTarget);
    setFormData(data);

    try {
      // Get session token and URL from our backend
      //   const response = await axios.post("/api/onramp/token", {
      //     walletAddress: publicKey?.toBase58(),
      //   });

      //   setIframeUrl(response.data.onrampUrl);

      setIframeUrl(
        'https://pay.coinbase.com/buy/select-asset?appId=7ed0c9d9-1e93-47bb-9ae5-f57b6f0207b5&addresses={"qWsuS2kxGbNxWKabVjJ6LvMgpCe6T5JghpqxDmn5RiJ":["solana"]}&assets=["USDC"]&presetFiatAmount=1&defaultExperience=buy&defaultPaymentMethod=CARD'
      );

      setStep("payment");
    } catch (error) {
      console.error("Payment initialization error:", error);
      toast.error("Failed to initialize payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentComplete = async () => {
    if (!formData || !publicKey) return;

    try {
      setStep("processing");

      // Create multisig wallet
      const { multisigPda } = await createMultisig.mutateAsync({
        creator: publicKey,
        email: userInfo?.email || "",
        configAuthority: publicKey,
      });

      // Create organization with the new multisig
      await createOrganization.mutateAsync({
        name: formData.get("name") as string,
        multisig_wallet: multisigPda.toBase58(),
        owner_name: formData.get("ownerName") as string,
        owner_email: userInfo?.email || "",
        owner_wallet_address: publicKey.toBase58(),
        business_details: {
          companyName: formData.get("companyName") as string,
          companyAddress:
            (formData.get("companyAddress") as string) || undefined,
          companyPhone: (formData.get("companyPhone") as string) || undefined,
          companyEmail: (formData.get("companyEmail") as string) || undefined,
        },
      });

      onOpenChange(false);
      onSubmitSuccess();
      toast.success("Organization registered successfully!");
    } catch (error) {
      toast.error("Failed to complete registration");
      console.error("Registration error:", error);
      setStep("details");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <FiPlus /> Register Vendor
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Register Vendor</DialogTitle>
        </DialogHeader>

        {step === "details" && (
          <>
            <form onSubmit={handleInitialSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Your Full Name*</Label>
                <Input name="ownerName" required />
              </div>
              <div className="space-y-2">
                <Label>Organization Name*</Label>
                <Input name="name" required />
              </div>
              <div className="space-y-2">
                <Label>Company Name*</Label>
                <Input name="companyName" required />
              </div>
              <div className="space-y-2">
                <Label>Company Address*</Label>
                <Input name="companyAddress" required />
              </div>
              <div className="space-y-2">
                <Label>Company Phone</Label>
                <Input name="companyPhone" type="tel" />
              </div>
              <div className="space-y-2">
                <Label>Company Email</Label>
                <Input name="companyEmail" type="email" />
              </div>

              <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground mt-4">
                <p>Next steps:</p>
                <ol className="list-decimal ml-4 mt-2 space-y-1">
                  <li>
                    Complete a quick $1 USDC payment with your debit/credit card
                  </li>
                  <li>We'll create your secure multisig wallet</li>
                  <li>Set up your vendor profile</li>
                </ol>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⭮</span>
                    Preparing Payment...
                  </>
                ) : (
                  "Continue to Payment"
                )}
              </Button>
            </form>
          </>
        )}

        {step === "payment" && iframeUrl && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Complete the $1 USDC payment with your card to create your vendor
              account.
            </div>
            <div className="border rounded-lg overflow-hidden">
              <iframe
                src={iframeUrl}
                className="w-full h-[600px]"
                frameBorder="0"
                onLoad={(e) => {
                  // Listen for payment completion message
                  window.addEventListener("message", (event) => {
                    if (
                      event.origin === "https://pay.coinbase.com" &&
                      event.data.type === "onramp_purchase_completed"
                    ) {
                      handlePaymentComplete();
                    }
                  });
                }}
              />
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 font-medium">
              Setting up your vendor account...
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This may take a few moments. Please don't close this window.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
