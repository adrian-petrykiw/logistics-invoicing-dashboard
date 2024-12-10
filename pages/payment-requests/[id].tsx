import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import Link from "next/link";
import { FileIcon, Loader2 } from "lucide-react";
import { usePaymentRequest } from "@/features/payment-requests/hooks/usePaymentRequest";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PublicKey } from "@solana/web3.js";
import { getMultisigPda } from "@sqds/multisig";
import { initOnRamp, InitOnRampParams } from "@coinbase/cbpay-js";
import { useCreditBalance } from "@/features/dashboard/hooks/useCreditBalance";
import { useVendorInfo } from "@/hooks/useVendorInfo";
import { useOrganization } from "@/features/auth/hooks/useOrganization";

const organizationSchema = z.object({
  ownerName: z.string().min(1, "Owner name is required"),
  companyName: z.string().min(1, "Company name is required"),
  companyAddress: z.string().min(1, "Company address is required"),
  companyPhone: z.string().optional(),
  companyEmail: z.string().email("Invalid email address"),
  companyWebsite: z.string().url().optional(),
  registrationNumber: z.string().optional(),
  taxNumber: z.string().optional(),
});

const verificationSchema = z.object({
  code: z.string().length(6, "Verification code must be 6 digits"),
});

const paymentSchema = z.object({
  paymentMethod: z.enum([
    "account_credit",
    "ach",
    "wire",
    "credit_card",
    "debit_card",
  ]),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;
type VerificationFormData = z.infer<typeof verificationSchema>;
type PaymentFormData = z.infer<typeof paymentSchema>;

export default function PaymentRequestPage() {
  const router = useRouter();
  const { id } = router.query;
  const { connected, publicKey } = useWallet();
  const { user, isAuthenticated } = useAuth();
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [showOrgRegistration, setShowOrgRegistration] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    string | null
  >(null);

  const {
    data: paymentRequest,
    isLoading: paymentRequestLoading,
    error: paymentRequestError,
  } = usePaymentRequest(id as string);

  // Fetch sender organization details
  const { organization: senderOrganization, isLoading: senderOrgLoading } =
    useOrganization(paymentRequest?.sender?.wallet_address || "");

  // Fetch recipient organization details
  const { data: recipientOrgInfo, isLoading: recipientOrgLoading } =
    useVendorInfo(paymentRequest?.recipient?.organization?.name || null);

  // Get credit balance if organization exists and has a multisig
  const multisigPda = recipientOrgInfo?.multisigAddress
    ? new PublicKey(recipientOrgInfo.multisigAddress)
    : null;

  const { data: creditBalance, isLoading: balanceLoading } =
    useCreditBalance(multisigPda);

  const isLoading =
    paymentRequestLoading ||
    senderOrgLoading ||
    recipientOrgLoading ||
    balanceLoading;

  // Organization registration form
  const orgForm = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      companyEmail:
        paymentRequest?.recipient.organization?.business_details.companyEmail,
      companyName:
        paymentRequest?.recipient.organization?.business_details.companyName,
    },
  });

  // Verification form
  const verificationForm = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
  });

  // Payment form
  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  });

  // Determine if organization needs registration
  const needsRegistration = recipientOrgInfo?.multisigAddress === "pending";

  const handlePayment = async () => {
    if (
      !publicKey ||
      !paymentRequest ||
      !creditBalance ||
      creditBalance < paymentRequest.amount
    ) {
      return;
    }

    setProcessingPayment(true);

    try {
      // Updated transaction data using proper organization details
      const transactionData = {
        amount: paymentRequest.amount,
        sender: {
          organizationId: senderOrganization?.id,
          multisigWallet: senderOrganization?.multisig_wallet,
        },
        recipient: {
          organizationId:
            recipientOrgInfo?.multisigAddress !== "pending"
              ? recipientOrgInfo?.multisigAddress
              : undefined,
          multisigWallet: recipientOrgInfo?.multisigAddress,
        },
        paymentRequestId: paymentRequest.id,
        invoices: paymentRequest.invoices,
      };

      const response = await fetch("/api/transactions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user
            ? {
                "x-user-email": user.email,
                "x-wallet-address": user.walletAddress,
                "x-user-info": JSON.stringify(user.userInfo),
              }
            : {}),
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        throw new Error("Failed to create transaction");
      }

      const { signature } = await response.json();

      await fetch(`/api/payment-requests/${paymentRequest.id}/update-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user
            ? {
                "x-user-email": user.email,
                "x-wallet-address": user.walletAddress,
                "x-user-info": JSON.stringify(user.userInfo),
              }
            : {}),
        },
        body: JSON.stringify({ status: "paid", signature }),
      });

      toast.success("Payment processed successfully!");
      router.push("/transactions");
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleOnrampPayment = async () => {
    if (!publicKey || !paymentRequest || !recipientOrgInfo) {
      return;
    }

    setProcessingPayment(true);

    try {
      const partnerUserId = `${publicKey
        .toBase58()
        .substring(0, 20)}_${Date.now()}`;

      // Initialize vault with proper organization ID
      const vaultResult = await fetch("/api/vault/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user
            ? {
                "x-user-email": user.email,
                "x-wallet-address": user.walletAddress,
                "x-user-info": JSON.stringify(user.userInfo),
              }
            : {}),
        },
        body: JSON.stringify({
          userWallet: publicKey.toString(),
          organizationId:
            recipientOrgInfo.multisigAddress !== "pending"
              ? recipientOrgInfo.multisigAddress
              : undefined,
        }),
      });

      if (!vaultResult.ok) {
        throw new Error("Failed to initialize vault");
      }

      const { ataAddress } = await vaultResult.json();

      const options: InitOnRampParams = {
        appId: process.env.NEXT_PUBLIC_COINBASE_APP_ID!,
        widgetParameters: {
          destinationWallets: [
            {
              address: ataAddress,
              assets: ["USDC"],
              supportedNetworks: ["solana"],
            },
          ],
          presetCryptoAmount: paymentRequest.amount,
          defaultExperience: "buy",
          partnerUserId,
        },
        onSuccess: async () => {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          await handlePayment();
        },
        onExit: () => {
          setProcessingPayment(false);
          toast.error("Payment process was cancelled");
        },
        experienceLoggedIn: "popup",
        experienceLoggedOut: "popup",
        closeOnExit: true,
        closeOnSuccess: true,
      };

      initOnRamp(options, (error, instance) => {
        if (instance) {
          instance.open();
        } else {
          throw error || new Error("Failed to initialize payment");
        }
      });
    } catch (error) {
      console.error("Onramp error:", error);
      toast.error(
        error instanceof Error ? error.message : "Payment initialization failed"
      );
      setProcessingPayment(false);
    }
  };

  // Handle email verification
  const handleSendVerification = async () => {
    try {
      const response = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:
            paymentRequest?.recipient.organization?.business_details
              .companyEmail,
        }),
      });

      if (!response.ok) throw new Error("Failed to send verification code");

      setVerificationSent(true);
      toast.success("Verification code sent!");
    } catch (error) {
      toast.error("Failed to send verification code");
    }
  };

  // Handle verification code submission
  const handleVerifyCode = async (data: VerificationFormData) => {
    try {
      const response = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:
            paymentRequest?.recipient.organization?.business_details
              .companyEmail,
          code: data.code,
        }),
      });

      if (!response.ok) throw new Error("Invalid verification code");

      setVerificationComplete(true);
      setShowOrgRegistration(true);
      toast.success("Email verified successfully!");
    } catch (error) {
      toast.error("Invalid verification code");
    }
  };

  // Handle organization registration
  const handleOrgRegistration = async (data: OrganizationFormData) => {
    if (!publicKey || !senderOrganization?.id) {
      toast.error("Missing required organization information");
      return;
    }

    try {
      // Create multisig
      const multisigResult = await fetch("/api/create-multisig", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user
            ? {
                "x-user-email": user.email,
                "x-wallet-address": user.walletAddress,
                "x-user-info": JSON.stringify(user.userInfo),
              }
            : {}),
        },
        body: JSON.stringify({
          creator: publicKey.toString(),
          email: data.companyEmail,
        }),
      });

      if (!multisigResult.ok) throw new Error("Failed to create multisig");
      const { multisigPda } = await multisigResult.json();

      // Update organization with null check
      const orgResult = await fetch("/api/update-organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user
            ? {
                "x-user-email": user.email,
                "x-wallet-address": user.walletAddress,
                "x-user-info": JSON.stringify(user.userInfo),
              }
            : {}),
        },
        body: JSON.stringify({
          organizationId: senderOrganization.id,
          multisigWallet: multisigPda,
          businessDetails: {
            ...data,
            ownerWalletAddress: publicKey.toString(),
          },
        }),
      });

      if (!orgResult.ok) throw new Error("Failed to update organization");

      setShowOrgRegistration(false);
      toast.success("Organization registered successfully!");
    } catch (error) {
      console.error("Organization registration error:", error);
      toast.error("Failed to register organization");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto py-12 px-4">
          <div className="space-y-8">
            <Skeleton className="h-8 w-72 mx-auto" />
            <Card>
              <CardContent className="p-6 space-y-6">
                <Skeleton className="h-12 w-32" />
                <Skeleton className="h-4 w-48" />
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (paymentRequestError || !paymentRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Payment Request Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            The payment request you're looking for doesn't exist or has been
            removed.
          </p>
          <Link href="/">
            <Button variant="outline">Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="space-y-4">
          <div className="text-start">
            <h1 className="text-xl font-semibold text-gray-900">
              Payment Request Details
            </h1>
          </div>

          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <div className="text-3xl font-bold text-gray-900">
                  ${paymentRequest.amount.toFixed(2)}
                </div>
                <div className="text-gray-600 mt-1">
                  Due by{" "}
                  {format(new Date(paymentRequest.due_date), "MMMM d, yyyy")}
                </div>
              </div>

              {/* Sender and Recipient Info */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      From:
                    </h3>
                    <div className="text-sm text-gray-600">
                      <p className="font-medium">
                        {
                          paymentRequest.sender.organization?.business_details
                            .companyName
                        }
                      </p>
                      <p>
                        {
                          paymentRequest.sender.organization?.business_details
                            .companyEmail
                        }
                      </p>
                      {paymentRequest.sender.organization?.business_details
                        .companyAddress && (
                        <p>
                          {
                            paymentRequest.sender.organization.business_details
                              .companyAddress
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      To:
                    </h3>
                    <div className="text-sm text-gray-600">
                      <p className="font-medium">
                        {
                          paymentRequest.recipient.organization
                            ?.business_details.companyName
                        }
                      </p>
                      <p>
                        {
                          paymentRequest.recipient.organization
                            ?.business_details.companyEmail
                        }
                      </p>
                      {paymentRequest.recipient.organization?.business_details
                        .companyAddress && (
                        <p>
                          {
                            paymentRequest.recipient.organization
                              .business_details.companyAddress
                          }
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoices */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Invoices:
                </h3>
                <div className="space-y-3">
                  {paymentRequest.invoices.map((invoice) => (
                    <div
                      key={invoice.number}
                      className="flex items-start justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Invoice {invoice.number}
                        </p>
                        {invoice.files && invoice.files.length > 0 && (
                          <div className="mt-1 space-x-2">
                            {invoice.files.map((file) => (
                              <a
                                key={file.url}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
                              >
                                <FileIcon className="h-3 w-3 mr-1" />
                                {file.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-gray-900">
                        ${invoice.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {paymentRequest.metadata?.payment_request?.notes && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Notes:
                  </h3>
                  <p className="text-sm text-gray-600">
                    {paymentRequest.metadata.payment_request.notes}
                  </p>
                </div>
              )}

              {/* Organization Registration Section */}
              {needsRegistration && isAuthenticated && !showOrgRegistration && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Email Verification Required
                  </h3>
                  {!verificationSent ? (
                    <Button onClick={handleSendVerification}>
                      Send Verification Code
                    </Button>
                  ) : (
                    <Form {...verificationForm}>
                      <form
                        onSubmit={verificationForm.handleSubmit(
                          handleVerifyCode
                        )}
                      >
                        <div className="space-y-4">
                          <FormField
                            control={verificationForm.control}
                            name="code"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Verification Code</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Enter 6-digit code"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit">Verify Code</Button>
                        </div>
                      </form>
                    </Form>
                  )}
                </div>
              )}

              {showOrgRegistration && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">
                    Complete Organization Registration
                  </h3>
                  <Form {...orgForm}>
                    <form
                      onSubmit={orgForm.handleSubmit(handleOrgRegistration)}
                      className="space-y-4"
                    >
                      <FormField
                        control={orgForm.control}
                        name="ownerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Owner Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={orgForm.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={orgForm.control}
                          name="companyPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Phone</FormLabel>
                              <FormControl>
                                <Input {...field} type="tel" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={orgForm.control}
                        name="companyAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Address</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={orgForm.control}
                          name="registrationNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Registration Number</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={orgForm.control}
                          name="taxNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tax Number</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={orgForm.control}
                        name="companyWebsite"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Website</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="url"
                                placeholder="https://"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button type="submit" className="w-full">
                        Register Organization
                      </Button>
                    </form>
                  </Form>
                </div>
              )}

              {/* Payment Method Selection */}
              {isAuthenticated && !needsRegistration && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">
                    Payment Method
                  </h3>
                  <Form {...paymentForm}>
                    <form className="space-y-4">
                      <FormField
                        control={paymentForm.control}
                        name="paymentMethod"
                        render={({ field }) => (
                          <FormItem>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                setSelectedPaymentMethod(value);
                              }}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select payment method" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="account_credit">
                                  Available Credit
                                </SelectItem>
                                <SelectItem value="credit_card">
                                  Credit Card
                                </SelectItem>
                                <SelectItem value="debit_card">
                                  Debit Card
                                </SelectItem>
                                <SelectItem value="ach">
                                  ACH Transfer
                                </SelectItem>
                                <SelectItem value="wire">
                                  Wire Transfer
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {selectedPaymentMethod === "account_credit" && (
                        <div className="text-sm">
                          <p className="text-gray-600">
                            Available Balance: $
                            {creditBalance?.toFixed(2) || "0.00"} USDC
                          </p>
                          {(creditBalance || 0) < paymentRequest.amount && (
                            <p className="text-red-500 mt-1">
                              Insufficient balance. Please choose another
                              payment method or add funds.
                            </p>
                          )}
                        </div>
                      )}
                    </form>
                  </Form>
                </div>
              )}

              {/* Payment Action */}
              <div className="border-t pt-6">
                {!connected || !isAuthenticated ? (
                  <Button className="w-full" size="lg" disabled={true}>
                    Login/Signup to Pay
                  </Button>
                ) : processingPayment ? (
                  <Button className="w-full" size="lg" disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Payment...
                  </Button>
                ) : selectedPaymentMethod === "account_credit" ? (
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={(creditBalance || 0) < paymentRequest.amount}
                    onClick={handlePayment}
                  >
                    Pay with Available Credit
                  </Button>
                ) : selectedPaymentMethod ? (
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleOnrampPayment}
                  >
                    Continue with Payment
                  </Button>
                ) : (
                  <Button className="w-full" size="lg" disabled>
                    Select Payment Method
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Processing Dialog */}
      <Dialog
        open={processingPayment}
        onOpenChange={(open) => !open && setProcessingPayment(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Processing Payment</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
