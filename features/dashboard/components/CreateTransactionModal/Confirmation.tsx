import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CombinedFormValues } from "@/schemas/combinedform";
import { PaymentDetailsFormValues } from "@/schemas/paymentdetails";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { useState } from "react";
import toast from "react-hot-toast";
import { getMultisigPda, getVaultPda } from "@sqds/multisig";
import { Check, Loader2 } from "lucide-react";
import { TransactionService } from "@/services/transactionservice";
import { useVendorDetails } from "../../hooks/useVendorDetails";
import { getApiUser } from "@/utils/user";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { getAuthHeaders } from "@/hooks/useApi";
import { createUsdcTransferTransaction } from "@/services/createAndExecuteUsdcTransfer";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  TokenAccountNotFoundError,
} from "@solana/spl-token";
import { solanaService } from "@/services/solana";
const heliusConnection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL!,
  "confirmed"
);

interface ConfirmationProps {
  onClose: () => void;
  onBack: () => void;
  vendorData: CombinedFormValues;
  paymentData: PaymentDetailsFormValues & { amount: number };
}

type StatusType =
  | "initial"
  | "encrypting"
  | "creating"
  | "confirming"
  | "confirmed";

function TransactionStatus({
  currentStatus,
  onDone,
}: {
  currentStatus: Exclude<StatusType, "initial">;
  onDone: () => void;
}) {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-4">
        <StatusItem
          title="Encrypting Business Data"
          isActive={currentStatus === "encrypting"}
          isDone={currentStatus !== "encrypting"}
        />
        <StatusItem
          title="Creating Transaction"
          isActive={currentStatus === "creating"}
          isDone={
            currentStatus !== "creating" && currentStatus !== "encrypting"
          }
        />
        <StatusItem
          title="Confirming Transaction"
          isActive={currentStatus === "confirming"}
          isDone={currentStatus === "confirmed"}
        />
        {currentStatus === "confirmed" && (
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Check className="h-5 w-5 text-green-500" />
                <span className="text-green-700 font-medium">
                  Payment Confirmed!
                </span>
              </div>
              <Button
                onClick={onDone}
                variant="outline"
                className="px-4 py-2 text-green-600 border-green-200 hover:bg-green-100"
              >
                Done
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatusItem({
  title,
  isActive,
  isDone,
}: {
  title: string;
  isActive: boolean;
  isDone: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span
          className={`${
            isDone
              ? "text-gray-500"
              : isActive
              ? "text-blue-600 font-medium"
              : "text-gray-400"
          }`}
        >
          {title}
        </span>
        {isActive ? (
          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
        ) : isDone ? (
          <Check className="h-5 w-5 text-green-500" />
        ) : null}
      </div>
    </Card>
  );
}

export function Confirmation({
  onClose,
  onBack,
  vendorData,
  paymentData,
}: ConfirmationProps) {
  const [status, setStatus] = useState<StatusType>("initial");
  const [isVendorLoading, setIsVendorLoading] = useState(false);
  const { connection } = useConnection();
  const { publicKey, wallet, signTransaction } = useWallet();
  const { user } = useAuth();
  const apiUser = getApiUser(user);
  const api = useApi(apiUser);
  const { data: vendorDetails, isLoading } = useVendorDetails(
    vendorData?.vendor
  );

  // const handleConfirm = async () => {
  //   try {
  //     if (!publicKey || !wallet?.adapter || !apiUser) {
  //       toast.error("Please connect your wallet");
  //       return;
  //     }

  //     setIsVendorLoading(true);
  //     console.log("Starting confirmation with vendor data:", vendorData);
  //     setStatus("encrypting");

  //     // Get the multisig PDA
  //     const senderCreateKey = PublicKey.findProgramAddressSync(
  //       [Buffer.from("squad"), publicKey.toBuffer()],
  //       new PublicKey("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf")
  //     )[0];

  //     console.log("Sender create key:", senderCreateKey.toString());

  //     const [senderMultisigPda] = getMultisigPda({
  //       createKey: senderCreateKey,
  //     });

  //     console.log("Sender multisig PDA:", senderMultisigPda.toString());

  //     const [senderVaultPda] = getVaultPda({
  //       multisigPda: senderMultisigPda,
  //       index: 0,
  //     });

  //     console.log("Sender vault PDA:", senderVaultPda.toString());

  //     setStatus("creating");
  //     console.log("Fetching vendor details for:", vendorData.vendor);
  //     const headers = getAuthHeaders(apiUser);
  //     const vendorInfo = await TransactionService.fetchVendorDetails(
  //       vendorData.vendor,
  //       headers
  //     );
  //     console.log("Received vendor info:", vendorInfo);

  //     const receiverCreateKey = new PublicKey(vendorInfo.ownerAddress);

  //     const [receiverMultisigPda] = getMultisigPda({
  //       createKey: receiverCreateKey,
  //     });

  //     const result = await TransactionService.createAndExecuteTransaction({
  //       connection,
  //       multisigPda: receiverMultisigPda,
  //       vaultPda: new PublicKey(vendorInfo.vaultAddress),
  //       invoices: vendorData.invoices.map((invoice) => ({
  //         number: invoice.number,
  //         amount: invoice.amount,
  //         recipient: vendorInfo.ownerAddress,
  //       })),
  //       businessData: {
  //         vendor: vendorData.vendor,
  //         additionalInfo: vendorData.additionalInfo,
  //         paymentMethod: paymentData.paymentMethod,
  //         timestamp: Date.now(),
  //         vendorMultisig: vendorInfo.multisigAddress,
  //       },
  //       senderPublicKey: publicKey,
  //     });

  //     console.log("Transaction result:", result);
  //     setStatus("confirming");
  //     setStatus("confirmed");
  //   } catch (error) {
  //     console.error("Transaction failed:", error);
  //     toast.error(
  //       error instanceof Error ? error.message : "Transaction failed"
  //     );
  //     setStatus("initial");
  //   } finally {
  //     setIsVendorLoading(false);
  //   }
  // };

  const handleConfirm = async () => {
    try {
      if (!publicKey || !signTransaction || !apiUser) {
        toast.error("Please connect your wallet");
        return;
      }

      setIsVendorLoading(true);
      console.log("Starting confirmation with vendor data:", vendorData);
      setStatus("encrypting");

      // Use heliusConnection for balance checks
      const solBalance = await heliusConnection.getBalance(publicKey);
      console.log("Current SOL balance:", solBalance / LAMPORTS_PER_SOL);

      // Fetch vendor details
      console.log("Fetching vendor details for:", vendorData.vendor);
      const headers = getAuthHeaders(apiUser);
      const vendorInfo = await TransactionService.fetchVendorDetails(
        vendorData.vendor,
        headers
      );
      console.log("Received vendor info:", vendorInfo);

      // Check if recipient has USDC account
      let recipientHasATA = false;
      try {
        const recipientATA = await getAssociatedTokenAddress(
          new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
          new PublicKey(vendorInfo.ownerAddress)
        );
        await getAccount(heliusConnection, recipientATA);
        recipientHasATA = true;
        console.log("Recipient has USDC account");
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          recipientHasATA = false;
          console.log("Recipient needs USDC account creation");
        } else {
          console.error("Error checking recipient USDC account:", error);
          throw error;
        }
      }

      // Calculate required fees
      const LAMPORTS_FOR_ATA = 0.002 * LAMPORTS_PER_SOL;
      const LAMPORTS_FOR_TRANSFER = 0.000005 * LAMPORTS_PER_SOL;
      const requiredLamports = recipientHasATA
        ? LAMPORTS_FOR_TRANSFER
        : LAMPORTS_FOR_ATA + LAMPORTS_FOR_TRANSFER;

      if (solBalance < requiredLamports) {
        throw new Error(
          `Insufficient SOL for transaction fees. Need ${(
            requiredLamports / LAMPORTS_PER_SOL
          ).toFixed(6)} SOL, have ${(solBalance / LAMPORTS_PER_SOL).toFixed(
            6
          )} SOL`
        );
      }

      setStatus("creating");

      // Calculate total amount from all invoices
      const totalAmount = vendorData.invoices.reduce(
        (sum, invoice) => sum + invoice.amount,
        0
      );

      // Check USDC balance
      try {
        const senderUsdcAddress = await getAssociatedTokenAddress(
          new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
          publicKey
        );
        const senderAccount = await getAccount(
          heliusConnection,
          senderUsdcAddress
        );
        const usdcBalance = Number(senderAccount.amount) / 10 ** 6;
        console.log("Sender USDC balance:", usdcBalance);

        if (usdcBalance < totalAmount) {
          throw new Error(
            `Insufficient USDC balance. Have ${usdcBalance}, need ${totalAmount}`
          );
        }
      } catch (error) {
        console.error("Error checking USDC balance:", error);
        if (error instanceof TokenAccountNotFoundError) {
          throw new Error("You don't have a USDC token account");
        }
        throw new Error("Failed to check USDC balance");
      }

      // Create transaction
      const { transaction, blockhash, lastValidBlockHeight } =
        await createUsdcTransferTransaction({
          amount: totalAmount,
          recipientWallet: new PublicKey(vendorInfo.ownerAddress),
          connection: heliusConnection,
          publicKey,
        });

      console.log("Transaction created, proceeding to sign");
      setStatus("confirming");

      // Sign transaction
      const signedTx = await signTransaction(transaction);
      console.log("Transaction signed");

      // Send transaction using wallet's connection
      const signature = await heliusConnection.sendRawTransaction(
        signedTx.serialize(),
        {
          skipPreflight: true,
          maxRetries: 5,
        }
      );

      console.log("Transaction sent:", signature);

      // Wait for confirmation using a more robust strategy
      try {
        // const confirmation = await heliusConnection.confirmTransaction(
        //   {
        //     signature,
        //     blockhash,
        //     lastValidBlockHeight,
        //   },
        //   "confirmed"
        // );

        // if (confirmation.value.err) {
        //   throw new Error(`Transaction failed: ${confirmation.value.err}`);
        // }

        // // Double check the transaction
        // const txResult = await heliusConnection.getTransaction(signature, {
        //   maxSupportedTransactionVersion: 0,
        // });

        // if (!txResult) {
        //   throw new Error("Transaction confirmation failed");
        // }

        console.log("Transaction confirmed");
        // Store transaction record
        const transactionRecord = {
          signature,
          timestamp: Date.now(),
          invoices: vendorData.invoices,
          vendor: vendorData.vendor,
          additionalInfo: vendorData.additionalInfo,
          paymentMethod: paymentData.paymentMethod,
          amount: totalAmount,
          recipientAddress: vendorInfo.ownerAddress,
          senderAddress: publicKey.toString(),
          fees: {
            estimatedSol: requiredLamports / LAMPORTS_PER_SOL,
            createdATA: !recipientHasATA,
          },
        };

        console.log("Transaction record:", transactionRecord);

        setStatus("confirmed");
      } catch (error) {
        console.error("Error confirming transaction:", error);

        // Try to get the transaction status one more time
        try {
          const status = await connection.getSignatureStatus(signature);
          console.log("Final transaction status:", status);

          if (status.value?.err) {
            throw new Error(`Transaction failed: ${status.value.err}`);
          } else if (
            status.value?.confirmationStatus === "confirmed" ||
            status.value?.confirmationStatus === "finalized"
          ) {
            // Transaction actually succeeded
            setStatus("confirmed");
            return;
          }
        } catch (statusError) {
          console.error("Failed to get final transaction status:", statusError);
        }

        // If we got here, the transaction definitely failed
        throw new Error("Transaction failed to confirm");
      }
    } catch (error) {
      console.error("Transaction failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Transaction failed"
      );
      setStatus("initial");
    } finally {
      setIsVendorLoading(false);
    }
  };

  if (status !== "initial") {
    return <TransactionStatus currentStatus={status} onDone={onClose} />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
        <div className="space-y-4 pb-4">
          <h2 className="text-lg font-semibold">Vendor & Shipping Details</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Vendor Card */}
            <div className="flex flex-col">
              <p className="font-medium text-sm pb-2">Vendor</p>
              <Card className="bg-muted/50 rounded-md">
                <CardContent className="p-4">
                  {!vendorData?.vendor ? (
                    <div className="text-sm text-muted-foreground justify-center p-4 items-center text-center">
                      Vendor not found
                    </div>
                  ) : isVendorLoading || isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-2 w-[250px]" />
                      <Skeleton className="h-2 w-[200px]" />
                      <Skeleton className="h-2 w-[150px]" />
                    </div>
                  ) : vendorDetails ? (
                    <div className="p-0 m-0">
                      <h4 className="font-semibold text-sm">
                        {vendorDetails.business_details.companyName}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {vendorDetails.business_details.companyAddress}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {vendorDetails.business_details.companyPhone}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {vendorDetails.business_details.companyEmail}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            {/* Invoices */}
            <div>
              <div className="flex justify-between">
                <p className="font-medium text-sm mb-2">Invoices</p>
              </div>
              <div className="space-y-2">
                {vendorData?.invoices.map((invoice, index) => (
                  <Card key={index} className="bg-muted/50 rounded-md">
                    <CardContent className="flex w-full justify-between items-center h-full m-0 px-4 py-2 text-xs">
                      <p>#{invoice.number}</p>
                      <p>{invoice.amount} USDC</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Dynamic Fields */}
            {Object.entries(vendorData || {})
              .reverse()
              .map(([key, value]) => {
                if (
                  key === "vendor" ||
                  key === "invoices" ||
                  key === "sender" ||
                  key === "receiver" ||
                  key === "amount" ||
                  typeof value === "object" ||
                  !value
                ) {
                  return null;
                }

                const formattedKey = key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/_/g, " ")
                  .replace(/^./, (str) => str.toUpperCase());

                return (
                  <div key={key}>
                    <p className="font-medium text-xs mb-2">{formattedKey}</p>
                    <p className="text-xs text-muted-foreground">
                      {String(value)}
                    </p>
                  </div>
                );
              })}
          </div>
        </div>

        <Separator />

        {/* Payment Details Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Payment Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium text-sm mb-2">Payment Method</p>
              <p className="text-sm text-muted-foreground">
                {paymentData.paymentMethod.toLocaleUpperCase()}
              </p>
            </div>
            <div>
              <p className="font-medium text-sm mb-2 justify-end text-end w-full">
                Total Amount
              </p>
              <p className="text-sm text-muted-foreground justify-end text-end w-full">
                ${paymentData.amount.toFixed(2)}
              </p>
            </div>
            {paymentData?.paymentMethod === "ach" && (
              <>
                <div>
                  <p className="font-medium text-sm">Account Name</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentData?.accountName}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-sm">Account Type</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentData?.accountType}
                  </p>
                </div>
              </>
            )}

            {paymentData?.paymentMethod === "wire" && (
              <>
                <div>
                  <p className="font-medium text-sm">Bank Name</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentData?.bankName}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-sm">Swift Code</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentData?.swiftCode}
                  </p>
                </div>
              </>
            )}

            {(paymentData?.paymentMethod === "credit_card" ||
              paymentData?.paymentMethod === "debit_card") && (
              <>
                <div>
                  <p className="font-medium text-sm">Card Holder</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentData?.billingName}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-sm">Billing Address</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentData?.billingAddress}, {paymentData?.billingCity},{" "}
                    {paymentData?.billingState} {paymentData?.billingZip}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-background mt-auto">
        <div className="flex gap-4">
          <Button
            onClick={onBack}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700"
            variant="secondary"
          >
            Back
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1"
            disabled={!publicKey || isVendorLoading || isLoading}
          >
            Confirm & Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
