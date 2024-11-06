import { useState, useRef } from "react";
import { useRouter } from "next/router";
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
import { AuthUser } from "@/types/auth"; // Ensure this import is correct

type Experience = "embedded" | "popup" | "new_tab";
type OnRampExperience = "buy" | "send";

interface CreateMultisigResult {
  multisigPda: PublicKey;
}

interface VendorRegistrationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userInfo: { email: string } | null;
  onSubmitSuccess: () => void;
  createMultisig: UseMutationResult<
    CreateMultisigResult,
    unknown,
    { creator: PublicKey; email: string; configAuthority: PublicKey },
    unknown
  >;
  createOrganization: UseMutationResult<
    unknown,
    unknown,
    {
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
    },
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
  const onrampInstance = useRef<any>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handlePaymentSuccess = async () => {
    try {
      // Wait until user is authenticated
      if (!user) {
        console.log("Waiting for user to be authenticated...");

        // Force refetch of the auth query
        await queryClient.refetchQueries({ queryKey: ["auth"] });

        // Wait up to 10 seconds for authentication
        const timeout = 10000;
        const pollInterval = 100;

        await new Promise<void>((resolve, reject) => {
          let waited = 0;
          const intervalId = setInterval(() => {
            if (waited >= timeout) {
              clearInterval(intervalId);
              reject(new Error("User not authenticated after waiting"));
            } else if (queryClient.getQueryData<AuthUser>(["auth"])) {
              clearInterval(intervalId);
              resolve();
            } else {
              waited += pollInterval;
            }
          }, pollInterval);
        });
      }

      // Fetch the latest user data
      const currentUser = queryClient.getQueryData<AuthUser>(["auth"]);

      if (!currentUser || !publicKey) {
        throw new Error("User not authenticated");
      }

      // Proceed with organization creation
      console.log(
        "Payment successful, starting organization creation process..."
      );
      setStep("processing");

      // Retrieve registration data from localStorage
      const storedData = localStorage.getItem("vendorRegistrationData");
      if (!storedData) {
        throw new Error("Registration data not found");
      }
      const formData = JSON.parse(storedData);

      // Proceed with creating the multisig and organization
      const { multisigPda } = await createMultisig.mutateAsync({
        creator: publicKey!,
        email: currentUser.email,
        configAuthority: publicKey!,
      });

      await createOrganization.mutateAsync({
        name: formData.companyName,
        multisig_wallet: multisigPda.toBase58(),
        owner_name: formData.ownerName,
        owner_email: currentUser.email,
        owner_wallet_address: publicKey!.toBase58(),
        business_details: {
          companyName: formData.companyName,
          companyAddress: formData.companyAddress,
          companyPhone: formData.companyPhone,
          companyEmail: formData.companyEmail,
        },
      });

      console.log("Organization created successfully");
      localStorage.removeItem("vendorRegistrationData");
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

    if (!publicKey) {
      toast.error("Please connect your wallet first");
      setFormDisabled(false);
      setIsSubmitting(false);
      return;
    }

    if (amount < 1 || amount > 500) {
      toast.error("Amount must be between $1 and $500");
      setIsSubmitting(false);
      setFormDisabled(false);
      return;
    }

    try {
      // Generate a shorter partnerUserId
      const basePublicKey = publicKey.toBase58();
      const timestamp = Math.floor(Date.now() / 1000).toString(); // Timestamp in seconds

      // Calculate maximum allowed length for the public key part
      const maxPublicKeyLength = 50 - timestamp.length - 1; // Subtract length of timestamp and '_'
      const shortPublicKey = basePublicKey.substring(0, maxPublicKeyLength);

      const partnerUserId = `${shortPublicKey}_${timestamp}`;

      // Save registration data to localStorage in case we need it later
      const registrationData = {
        ownerName,
        companyName,
        companyAddress,
        companyPhone,
        companyEmail,
        amount,
        partnerUserId,
      };
      localStorage.setItem(
        "vendorRegistrationData",
        JSON.stringify(registrationData)
      );

      // Configure Coinbase OnRamp with specified parameters
      const options: InitOnRampParams = {
        appId: process.env.NEXT_PUBLIC_COINBASE_APP_ID!,
        widgetParameters: {
          destinationWallets: [
            {
              address: "qWsuS2kxGbNxWKabVjJ6LvMgpCe6T5JghpqxDmn5RiJ",
              assets: ["USDC"], // Restrict to USDC
              supportedNetworks: ["solana"], // Restrict to Solana network
            },
          ],
          presetCryptoAmount: amount, // Specify amount in USDC
          defaultExperience: "buy" as OnRampExperience,
          partnerUserId: partnerUserId, // Partner user ID
        },
        onSuccess: handlePaymentSuccess,
        onExit: () => {
          setFormDisabled(false);
          toast.error("Payment process was exited.");
        },
        experienceLoggedIn: "popup" as Experience,
        experienceLoggedOut: "popup" as Experience,
        closeOnExit: true,
        closeOnSuccess: true,
      };

      // Initialize the OnRamp instance
      initOnRamp(options, (error, instance) => {
        if (instance) {
          onrampInstance.current = instance;
          onrampInstance.current.open(); // Open the OnRamp flow
        } else {
          console.error("Failed to initialize Coinbase OnRamp:", error);
          toast.error("Failed to initialize Coinbase OnRamp");
          setFormDisabled(false);
          setIsSubmitting(false);
        }
      });
    } catch (error) {
      console.error("Payment initialization error:", error);
      toast.error("Failed to initialize payment");
      setFormDisabled(false);
      setIsSubmitting(false);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
