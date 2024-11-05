import { useState, useEffect } from "react";
import { useRouter } from "next/router";
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
import { PublicKey } from "@solana/web3.js";
import { UseMutationResult } from "@tanstack/react-query";
import { usePayment } from "../hooks/usePayment";

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
  const router = useRouter();
  const { publicKey } = useWallet();
  const [step, setStep] = useState<"details" | "processing">("details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formDisabled, setFormDisabled] = useState(false);
  const { checkPaymentStatus } = usePayment();

  useEffect(() => {
    const checkPaymentComplete = async () => {
      console.log("Payment status check triggered", {
        fullUrl: window.location.href,
        queryParams: router.query,
        hasPaymentParam: "payment" in router.query,
        paymentValue: router.query.payment,
      });

      if (router.query.payment === "complete") {
        const storedDataString = localStorage.getItem("vendorRegistrationData");

        if (storedDataString && publicKey) {
          try {
            const parsedData = JSON.parse(storedDataString);

            // Check payment status with Coinbase
            const isPaymentSuccess = await checkPaymentStatus(
              parsedData.partnerUserId
            );

            if (isPaymentSuccess) {
              console.log("Payment verified, proceeding with registration");
              await handleRedirectPaymentComplete(parsedData);
            } else {
              console.log("Payment not verified yet");
              toast.error("Payment verification failed. Please try again.");
              setFormDisabled(false);
              setIsSubmitting(false);
            }
          } catch (error) {
            console.error("Failed to process payment completion:", error);
            toast.error("Failed to complete registration");
            setFormDisabled(false);
            setIsSubmitting(false);
          }
        }
      }
    };

    checkPaymentComplete();
  }, [router.query.payment, publicKey]);

  useEffect(() => {
    if (!isOpen) {
      setIsSubmitting(false);
      setFormDisabled(false);
      setStep("details");
    }
  }, [isOpen]);

  const handleInitialSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormDisabled(true);
    const data = new FormData(e.currentTarget);
    const amount = parseFloat(data.get("amount") as string);

    console.log("Starting registration process...");

    // Validate amount
    if (amount < 1 || amount > 500) {
      toast.error("Amount must be between $1 and $500");
      setIsSubmitting(false);
      setFormDisabled(false);
      return;
    }

    try {
      const partnerUserId = `${publicKey
        ?.toBase58()
        .slice(0, 15)}_${Date.now()}`.slice(0, 49);

      const formData = {
        ownerName: data.get("ownerName"),
        companyName: data.get("companyName"),
        companyAddress: data.get("companyAddress"),
        companyPhone: data.get("companyPhone"),
        companyEmail: data.get("companyEmail"),
        amount: amount,
        partnerUserId,
      };

      console.log("Storing form data:", formData);
      localStorage.setItem("vendorRegistrationData", JSON.stringify(formData));

      const redirectUrl = `${window.location.origin}/settings?payment=complete`;

      const params = new URLSearchParams({
        appId: "7ed0c9d9-1e93-47bb-9ae5-f57b6f0207b5",
        addresses: JSON.stringify({
          qWsuS2kxGbNxWKabVjJ6LvMgpCe6T5JghpqxDmn5RiJ: ["solana"],
        }),
        assets: JSON.stringify(["USDC"]),
        presetFiatAmount: amount.toString(),
        defaultExperience: "buy",
        defaultPaymentMethod: "CARD",
        fiatCurrency: "USD",
        redirectUrl,
        partnerUserId,
        handlingRequestedUrls: "true",
      });

      const coinbaseUrl = `https://pay.coinbase.com/buy/select-asset?${params.toString()}`;
      console.log("Redirecting to Coinbase:", coinbaseUrl);

      const paymentWindow = window.open(coinbaseUrl, "_blank");
      // if (!paymentWindow) {
      //   window.location.href = coinbaseUrl;
      // }
    } catch (error) {
      console.error("Payment initialization error:", error);
      toast.error("Failed to initialize payment");
      setFormDisabled(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRedirectPaymentComplete = async (storedData: any) => {
    try {
      console.log("Starting organization creation process...");
      setStep("processing");

      const { multisigPda } = await createMultisig.mutateAsync({
        creator: publicKey!,
        email: userInfo?.email || "",
        configAuthority: publicKey!,
      });

      console.log("Multisig created:", multisigPda.toBase58());

      await createOrganization.mutateAsync({
        name: storedData.companyName,
        multisig_wallet: multisigPda.toBase58(),
        owner_name: storedData.ownerName,
        owner_email: userInfo?.email || "",
        owner_wallet_address: publicKey!.toBase58(),
        business_details: {
          companyName: storedData.companyName,
          companyAddress: storedData.companyAddress,
          companyPhone: storedData.companyPhone,
          companyEmail: storedData.companyEmail,
        },
      });

      console.log("Organization created successfully");
      localStorage.removeItem("vendorRegistrationData");
      router.replace("/settings", undefined, { shallow: true });
      onOpenChange(false);
      onSubmitSuccess();
      toast.success("Organization registered successfully!");
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Failed to complete registration");
      setStep("details");
      setFormDisabled(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!formDisabled) {
          onOpenChange(open);
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
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
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
                <Label>Company Phone</Label>
                <Input name="companyPhone" type="tel" disabled={formDisabled} />
              </div>
              <div className="space-y-2">
                <Label>Company Email</Label>
                <Input
                  name="companyEmail"
                  type="email"
                  disabled={formDisabled}
                />
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
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Processing...</span>
                </div>
              ) : formDisabled ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Waiting for payment...</span>
                </div>
              ) : (
                "Register"
              )}
            </Button>
          </form>
        )}

        {step === "processing" && (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 font-medium">Registering you as a vendor...</p>
            <p className="text-sm text-muted-foreground mt-2">
              This may take a few moments. Please don't close this window.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
