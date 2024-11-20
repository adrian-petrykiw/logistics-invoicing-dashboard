import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CombinedFormValues } from "@/schemas/combinedform";
import { PaymentDetailsFormValues } from "@/schemas/paymentdetails";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  TransactionMessage,
  TransactionInstruction,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  accounts,
  getMultisigPda,
  getVaultPda,
  instructions,
  PROGRAM_ID,
  rpc,
} from "@sqds/multisig";
import { Check, Loader2, UserRoundCheck } from "lucide-react";
import { TransactionService } from "@/services/transactionservice";
import { useVendorDetails } from "../../hooks/useVendorDetails";
import { getApiUser } from "@/utils/user";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { getAuthHeaders } from "@/hooks/useApi";
import { createCipheriv, createHash, randomBytes } from "crypto";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
} from "@solana/spl-token";
import bs58 from "bs58";
import { useOrganization } from "@/features/auth/hooks/useOrganization";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  USDC_MINT,
} from "@/utils/constants";
import { solanaService } from "@/services/solana";
import transactions from "@/pages/api/transactions";
import { CreateTransactionDTO } from "@/types/transaction";

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
  // const { connection } = useConnection();
  const { publicKey, wallet, signTransaction, sendTransaction } = useWallet();
  const { user } = useAuth();
  const apiUser = getApiUser(user);
  const api = useApi(apiUser);
  const { data: vendorDetails, isLoading } = useVendorDetails(
    vendorData?.vendor
  );

  const {
    organization,
    isLoading: orgLoading,
    createOrganization,
  } = useOrganization(publicKey?.toBase58() || "");

  const handleConfirm = async () => {
    try {
      if (!publicKey || !signTransaction || !apiUser) {
        toast.error("Please connect your wallet");
        return;
      }

      setIsVendorLoading(true);
      console.log("Starting confirmation with vendor data:", vendorData);
      setStatus("encrypting");

      // Helper functions for size estimation
      const estimateInstructionSize = (
        instruction: TransactionInstruction
      ): number => {
        let size = 100; // Base size for metadata
        size += instruction.data.length;
        size += instruction.keys.length * 32; // 32 bytes per pubkey
        return size;
      };

      const estimateTransactionSize = (
        instructions: TransactionInstruction[]
      ): number => {
        let size = 150; // Base transaction overhead
        instructions.forEach((ix) => {
          size += estimateInstructionSize(ix);
        });
        return size;
      };

      const encryptionKeys: Record<string, string> = {};
      const paymentHashes: Record<string, string> = {};

      // 1. Get sender's multisig and vault PDAs
      const senderMultisigPda = new PublicKey(
        `${organization?.multisig_wallet}`
      );
      console.log("Sender multisig PDA:", senderMultisigPda.toString());

      const [senderVaultPda] = getVaultPda({
        multisigPda: senderMultisigPda,
        index: 0,
      });
      console.log("Sender vault PDA:", senderVaultPda.toString());

      // 2. Get sender multisig info
      let senderMultisigInfo;
      try {
        senderMultisigInfo = await accounts.Multisig.fromAccountAddress(
          heliusConnection,
          senderMultisigPda
        );
        console.log("Found sender's multisig:", {
          threshold: senderMultisigInfo.threshold.toString(),
          transactionIndex: senderMultisigInfo.transactionIndex.toString(),
        });
      } catch (err) {
        console.error("Failed to find sender's multisig account:", err);
        throw new Error("Sender's multisig account not found");
      }

      // 3. Get USDC ATAs
      const senderUsdcAta = await getAssociatedTokenAddress(
        USDC_MINT,
        senderVaultPda,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      console.log("Sender vault USDC ATA:", senderUsdcAta.toString());

      // 4. Fetch vendor details
      setStatus("creating");
      console.log("Fetching vendor details for:", vendorData.vendor);
      const headers = getAuthHeaders(apiUser);
      const vendorInfo = await TransactionService.fetchVendorDetails(
        vendorData.vendor,
        headers
      );
      console.log("Received vendor info:", vendorInfo);

      const recieverVaultPda = new PublicKey(vendorInfo.vaultAddress);
      const receiverUsdcAta = await getAssociatedTokenAddress(
        USDC_MINT,
        recieverVaultPda,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      console.log("receiverUsdcAta: ", receiverUsdcAta);

      // 5. Prepare batches with size tracking
      const batches: Array<{
        invoices: typeof vendorData.invoices;
        instructions: TransactionInstruction[];
        estimatedSize: number;
      }> = [];

      let currentBatch = {
        invoices: [] as typeof vendorData.invoices,
        instructions: [] as TransactionInstruction[],
        estimatedSize: 150, // Base transaction overhead
      };

      // Encryption helper
      const encryptPaymentData = (data: any) => {
        const key = randomBytes(32);
        const iv = randomBytes(16);
        const cipher = createCipheriv("aes-256-cbc", key, iv);
        let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
        encrypted += cipher.final("hex");
        return {
          encrypted: iv.toString("hex") + ":" + encrypted,
          key: key.toString("hex"),
        };
      };

      // Process each invoice with size tracking
      for (const invoice of vendorData.invoices) {
        // Create transfer instruction
        const transferInstruction = createTransferInstruction(
          senderUsdcAta,
          receiverUsdcAta,
          senderVaultPda,
          BigInt(Math.round(invoice.amount * 1e6))
        );

        // Create and encrypt memo data
        const invoiceData = {
          invoice: {
            number: invoice.number,
            amount: invoice.amount,
          },
          vendor: vendorData.vendor,
          paymentMethod: paymentData.paymentMethod,
          timestamp: Date.now(),
        };

        const { encrypted: encryptedData, key: encryptionKey } =
          encryptPaymentData(invoiceData);

        encryptionKeys[invoice.number] = encryptionKey;
        paymentHashes[invoice.number] = createHash("sha256")
          .update(JSON.stringify(invoiceData))
          .digest("hex");

        // Create proof object
        const proof = {
          data: encryptedData,
          hash: paymentHashes[invoice.number],
          version: "1.0",
          invoiceNumber: invoice.number,
        };

        // Create memo instruction
        const memoInstruction = new TransactionInstruction({
          keys: [],
          programId: new PublicKey(
            "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
          ),
          data: Buffer.from(JSON.stringify(proof)),
        });

        console.log(
          "TX info: ",
          JSON.stringify({
            invoiceNumber: invoice.number,
            encryptionKey,
            paymentHash: proof.hash,
          })
        );

        // Store encryption key
        // try {
        //   await fetch("/api/transactions/store-key", {
        //     method: "POST",
        //     headers: {
        //       "Content-Type": "application/json",
        //       ...headers,
        //     },
        //     body: JSON.stringify({
        //       invoiceNumber: invoice.number,
        //       encryptionKey,
        //       paymentHash: proof.hash,
        //     }),
        //   });
        // } catch (error) {
        //   console.error("Failed to store encryption key:", error);
        // }

        // Calculate size with new instructions
        const newInstructions = [
          ...currentBatch.instructions,
          transferInstruction,
          memoInstruction,
        ];
        const newEstimatedSize = estimateTransactionSize(newInstructions);

        console.log(`Adding invoice ${invoice.number}:`, {
          currentBatchSize: currentBatch.estimatedSize,
          newEstimatedSize,
          transferSize: estimateInstructionSize(transferInstruction),
          memoSize: estimateInstructionSize(memoInstruction),
        });

        // Check if we need to create a new batch (leaving 100 bytes buffer)
        if (newEstimatedSize > 1132) {
          // 1232 - 100 buffer
          console.log(`Batch full, creating new batch:`, {
            invoicesInBatch: currentBatch.invoices.length,
            finalSize: currentBatch.estimatedSize,
          });

          if (currentBatch.instructions.length > 0) {
            batches.push({ ...currentBatch });
          }
          currentBatch = {
            invoices: [],
            instructions: [],
            estimatedSize: 150,
          };
        }

        // Add to current batch
        currentBatch.invoices.push(invoice);
        currentBatch.instructions.push(transferInstruction, memoInstruction);
        currentBatch.estimatedSize = newEstimatedSize;
      }

      // Add final batch if not empty
      if (currentBatch.instructions.length > 0) {
        batches.push(currentBatch);
      }

      console.log(
        "Final batch summary:",
        batches.map((batch, i) => ({
          batchIndex: i,
          invoiceCount: batch.invoices.length,
          instructionCount: batch.instructions.length,
          estimatedSize: batch.estimatedSize,
        }))
      );

      const adminKeypair = Keypair.fromSecretKey(
        bs58.decode(process.env.NEXT_PUBLIC_CB_SERVER_MVP_PK!)
      );

      // 6. Process each batch
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing batch ${i + 1} of ${batches.length}:`, {
          invoiceCount: batch.invoices.length,
          estimatedSize: batch.estimatedSize,
        });

        // Create transaction message
        const transactionMessage = new TransactionMessage({
          payerKey: senderVaultPda,
          recentBlockhash: (await heliusConnection.getLatestBlockhash())
            .blockhash,
          instructions: batch.instructions,
        });

        // Create vault transaction
        const newTransactionIndex = BigInt(
          Number(senderMultisigInfo.transactionIndex) === 0
            ? 1
            : Number(senderMultisigInfo.transactionIndex) + 1
        );
        console.log("Using transaction index:", newTransactionIndex.toString());
        let createTxSignature = ``;

        try {
          let createIx = await instructions.vaultTransactionCreate({
            multisigPda: senderMultisigPda,
            transactionIndex: newTransactionIndex,
            creator: publicKey,
            vaultIndex: 0,
            ephemeralSigners: 0,
            transactionMessage: transactionMessage,
            memo: `Batch ${i + 1}/${batches.length} - Invoices: ${batch.invoices
              .map((inv) => inv.number)
              .join(", ")}`,
          });

          const latestBlockhash = await heliusConnection.getLatestBlockhash(
            "confirmed"
          );
          const creatingTx = await solanaService.addPriorityFee(
            new Transaction().add(createIx),
            publicKey
          );
          creatingTx.feePayer = publicKey;
          creatingTx.recentBlockhash = latestBlockhash.blockhash;

          if (!signTransaction) {
            throw new Error("Wallet signTransaction is not available");
          }

          const signedTransaction = await signTransaction(creatingTx);
          console.log("Create TX signed");

          const signature = await heliusConnection.sendRawTransaction(
            signedTransaction.serialize(),
            {
              skipPreflight: false,
              preflightCommitment: "confirmed",
              maxRetries: 3,
            }
          );
          console.log("Create TX sent");

          const status = await solanaService.confirmTransactionWithRetry(
            signature,
            "confirmed"
          );

          console.log("Create tx sig: ", signature);
          console.log("Create tx status: ", status);
          createTxSignature = signature;
        } catch (e) {
          console.error("Failed to create tx: ", e);
          throw e;
        }

        console.log("Created vault transaction:", createTxSignature);

        await new Promise((resolve) => setTimeout(resolve, 20000));
        console.log("Awaited 20 sec after create");

        // Create proposal with instructions instead of rpc
        try {
          let proposalIx = await instructions.proposalCreate({
            multisigPda: senderMultisigPda,
            transactionIndex: newTransactionIndex,
            creator: publicKey,
          });

          const proposalTx = await solanaService.addPriorityFee(
            new Transaction().add(proposalIx),
            publicKey
          );
          proposalTx.feePayer = publicKey;
          proposalTx.recentBlockhash = (
            await heliusConnection.getLatestBlockhash()
          ).blockhash;

          const signedProposalTx = await signTransaction(proposalTx);
          const proposalSignature = await heliusConnection.sendRawTransaction(
            signedProposalTx.serialize(),
            {
              skipPreflight: false,
              preflightCommitment: "confirmed",
              maxRetries: 3,
            }
          );

          const proposalStatus =
            await solanaService.confirmTransactionWithRetry(
              proposalSignature,
              "confirmed",
              10,
              60000,
              heliusConnection
            );
          if (!proposalStatus) {
            throw new Error("Failed to get proposal status");
          }
          if (proposalStatus!.err) {
            throw new Error(
              `Transaction failed: ${JSON.stringify(proposalStatus!.err)}`
            );
          }
          console.log("Created proposal:", proposalSignature);

          setStatus("confirming");

          await new Promise((resolve) => setTimeout(resolve, 20000));
          console.log("Awaited 20 sec after proposal creation");

          // Vote on proposal using instructions
          let voteIx = await instructions.proposalApprove({
            multisigPda: senderMultisigPda,
            transactionIndex: newTransactionIndex,
            member: publicKey,
          });

          const voteTx = await solanaService.addPriorityFee(
            new Transaction().add(voteIx),
            publicKey
          );
          voteTx.feePayer = publicKey;
          voteTx.recentBlockhash = (
            await heliusConnection.getLatestBlockhash()
          ).blockhash;

          const signedVoteTx = await signTransaction(voteTx);
          const voteSignature = await heliusConnection.sendRawTransaction(
            signedVoteTx.serialize(),
            {
              skipPreflight: false,
              preflightCommitment: "confirmed",
              maxRetries: 3,
            }
          );

          const voteStatus = await solanaService.confirmTransactionWithRetry(
            voteSignature,
            "confirmed",
            10,
            60000,
            heliusConnection
          );
          if (!voteStatus) {
            throw new Error("Failed to get vote status");
          }
          if (voteStatus!.err) {
            throw new Error(
              `Transaction failed: ${JSON.stringify(voteStatus!.err)}`
            );
          }
          console.log("Voted on proposal:", voteSignature);

          await new Promise((resolve) => setTimeout(resolve, 30000));
          console.log("Awaited 30 sec after voting");

          console.log("Checking token accounts before execution:");
          console.log("Source ATA:", senderUsdcAta.toString());
          console.log("Destination ATA:", receiverUsdcAta.toString());

          const storeTransaction = async (
            executeTxSignature: string,
            batch: (typeof batches)[0],
            encryptionKeys: Record<string, string>,
            paymentHashes: Record<string, string>
          ) => {
            const transactionData: CreateTransactionDTO = {
              organization_id: organization?.id!,
              signature: executeTxSignature,
              token_mint: USDC_MINT.toString(),
              proof_data: {
                encryption_keys: encryptionKeys,
                payment_hashes: paymentHashes,
              },
              amount: batch.invoices.reduce((sum, inv) => sum + inv.amount, 0),
              transaction_type: "payment",
              sender: {
                multisig_address: senderMultisigPda.toString(),
                vault_address: senderVaultPda.toString(),
                wallet_address: publicKey.toString(),
              },
              recipient: {
                multisig_address: vendorInfo.multisigAddress,
                vault_address: vendorInfo.vaultAddress,
              },
              invoices: batch.invoices.map((inv) => ({
                number: inv.number,
                amount: inv.amount,
              })),
            };

            const response = await fetch("/api/transactions/store", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...headers,
              },
              body: JSON.stringify(transactionData),
            });

            if (!response.ok) {
              console.error(
                "Failed to store transaction:",
                await response.json()
              );
              throw new Error("Failed to store transaction record");
            }

            return await response.json();
          };

          try {
            const sourceAccount = await heliusConnection.getAccountInfo(
              senderUsdcAta
            );
            const destAccount = await heliusConnection.getAccountInfo(
              receiverUsdcAta
            );
            console.log("Source account exists:", !!sourceAccount);
            console.log("Destination account exists:", !!destAccount);
          } catch (error) {
            console.error("Error checking token accounts:", error);
          }

          // Execute transaction using instructions
          let executeIxResponse = await instructions.vaultTransactionExecute({
            connection: heliusConnection,
            multisigPda: senderMultisigPda,
            transactionIndex: newTransactionIndex,
            member: publicKey,
          });

          console.log(
            "Execute instruction response:",
            JSON.stringify(executeIxResponse)
          );
          const executeTx = await solanaService.addPriorityFee(
            new Transaction().add(executeIxResponse.instruction),
            publicKey
          );
          executeTx.feePayer = publicKey;
          executeTx.recentBlockhash = (
            await heliusConnection.getLatestBlockhash()
          ).blockhash;

          if (!signTransaction) {
            throw new Error("Wallet signTransaction is not available");
          }
          const signedExecuteTx = await signTransaction(executeTx);
          const executeTxSignature = await heliusConnection.sendRawTransaction(
            signedExecuteTx.serialize(),
            {
              skipPreflight: true,
              preflightCommitment: "confirmed",
              maxRetries: 3,
            }
          );

          const executeStatus = await solanaService.confirmTransactionWithRetry(
            executeTxSignature,
            "confirmed",
            10,
            60000,
            heliusConnection
          );

          if (!executeStatus) {
            throw new Error("Failed to get execution status");
          }
          if (executeStatus!.err) {
            throw new Error(
              `Transaction failed: ${JSON.stringify(executeStatus!.err)}`
            );
          }

          console.log("Executed transaction:", executeTxSignature, {
            batchSize: batch.estimatedSize,
            invoiceCount: batch.invoices.length,
          });

          await storeTransaction(
            executeTxSignature,
            batch,
            encryptionKeys,
            paymentHashes
          );
        } catch (error) {
          console.error("Transaction sequence failed:", error);
          throw error;
        }
      }

      setStatus("confirmed");
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
