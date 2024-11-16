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
} from "@solana/web3.js";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  accounts,
  getMultisigPda,
  getVaultPda,
  PROGRAM_ID,
  rpc,
} from "@sqds/multisig";
import { Check, Loader2 } from "lucide-react";
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
  const { publicKey, wallet, signTransaction } = useWallet();
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

      // 1. Get sender's multisig and vault PDAs
      // const senderCreateKey = PublicKey.findProgramAddressSync(
      //   [Buffer.from("squad"), publicKey.toBuffer()],
      //   PROGRAM_ID
      // )[0];
      // console.log("Sender create key:", senderCreateKey.toString());

      // const [senderMultisigPda] = getMultisigPda({
      //   createKey: senderCreateKey,
      // });
      const senderMultisigPda = new PublicKey(
        `${organization?.multisig_wallet}`
      );
      // const senderMultisigPda = new PublicKey(
      //   "7XjRxS1VM6rP4wsy4vDeuJ3KDUoMvVfmLqs896QHN2Dk"
      // );
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
      const senderVaultAta = await getAssociatedTokenAddress(
        USDC_MINT,
        senderVaultPda,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      console.log("Sender vault ATA:", senderVaultAta.toString());
      return;

      // 4. Fetch vendor details
      setStatus("creating");
      console.log("Fetching vendor details for:", vendorData.vendor);
      const headers = getAuthHeaders(apiUser);
      const vendorInfo = await TransactionService.fetchVendorDetails(
        vendorData.vendor,
        headers
      );
      console.log("Received vendor info:", vendorInfo);

      const receiverPubkey = new PublicKey(vendorInfo.ownerAddress);
      const receiverAta = await getAssociatedTokenAddress(
        new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
        receiverPubkey
      );

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
          senderVaultAta,
          receiverAta,
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

        // Create proof object
        const proof = {
          data: encryptedData,
          hash: createHash("sha256")
            .update(JSON.stringify(invoiceData))
            .digest("hex"),
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
          Number(senderMultisigInfo.transactionIndex) + i + 1
        );
        console.log(
          `Creating vault transaction ${newTransactionIndex.toString()}`
        );

        const createTxSignature = await rpc.vaultTransactionCreate({
          connection: heliusConnection,
          feePayer: adminKeypair,
          multisigPda: senderMultisigPda,
          transactionIndex: newTransactionIndex,
          creator: publicKey!,
          vaultIndex: 0,
          ephemeralSigners: 0,
          transactionMessage: transactionMessage,
          memo: `Batch ${i + 1}/${batches.length} - Invoices: ${batch.invoices
            .map((inv) => inv.number)
            .join(", ")}`,
        });

        const createVaultStatus =
          await solanaService.confirmTransactionWithRetry(
            createTxSignature,
            "confirmed",
            5, // maxRetries
            30000, // timeout
            heliusConnection
          );
        if (!createVaultStatus) {
          throw new Error("Failed to get transaction status");
        }
        if (createVaultStatus!.err) {
          throw new Error(
            `Transaction failed: ${JSON.stringify(createVaultStatus!.err)}`
          );
        }
        console.log("Created vault transaction:", createTxSignature);

        // Create proposal
        const proposalSignature = await rpc.proposalCreate({
          connection: heliusConnection,
          feePayer: adminKeypair,
          multisigPda: senderMultisigPda,
          transactionIndex: newTransactionIndex,
          creator: Keypair.generate(),
        });

        const proposalStatus = await solanaService.confirmTransactionWithRetry(
          proposalSignature,
          "confirmed",
          5,
          30000,
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

        // Vote on proposal
        const voteSignature = await rpc.proposalApprove({
          connection: heliusConnection,
          feePayer: adminKeypair,
          multisigPda: senderMultisigPda,
          transactionIndex: newTransactionIndex,
          member: Keypair.generate(),
        });

        const voteStatus = await solanaService.confirmTransactionWithRetry(
          voteSignature,
          "confirmed",
          5,
          30000,
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

        // Execute transaction
        const executeTxSignature = await rpc.vaultTransactionExecute({
          connection: heliusConnection,
          feePayer: adminKeypair,
          multisigPda: senderMultisigPda,
          transactionIndex: newTransactionIndex,
          member: publicKey!,
          sendOptions: { skipPreflight: true },
        });

        const executeStatus = await solanaService.confirmTransactionWithRetry(
          executeTxSignature,
          "confirmed",
          5,
          30000,
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

  // const handleConfirmOLD = async () => {
  //   try {
  //     if (!publicKey || !wallet?.adapter || !apiUser) {
  //       toast.error("Please connect your wallet");
  //       return;
  //     }

  //     setIsVendorLoading(true);
  //     console.log("Starting confirmation with vendor data:", vendorData);
  //     setStatus("encrypting");

  //     // Get the sender multisig PDA
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

  // const handleConfirm = async () => {
  //   try {
  //     if (!publicKey || !signTransaction || !apiUser) {
  //       toast.error("Please connect your wallet");
  //       return;
  //     }

  //     setIsVendorLoading(true);
  //     console.log("Starting confirmation with vendor data:", vendorData);
  //     setStatus("encrypting");

  //     // Use heliusConnection for balance checks
  //     const solBalance = await heliusConnection.getBalance(publicKey);
  //     console.log("Current SOL balance:", solBalance / LAMPORTS_PER_SOL);

  //     // Fetch vendor details
  //     console.log("Fetching vendor details for:", vendorData.vendor);
  //     const headers = getAuthHeaders(apiUser);
  //     const vendorInfo = await TransactionService.fetchVendorDetails(
  //       vendorData.vendor,
  //       headers
  //     );
  //     console.log("Received vendor info:", vendorInfo);

  //     // Check if recipient has USDC account
  //     let recipientHasATA = false;
  //     try {
  //       const recipientATA = await getAssociatedTokenAddress(
  //         new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  //         new PublicKey(vendorInfo.ownerAddress)
  //       );
  //       await getAccount(heliusConnection, recipientATA);
  //       recipientHasATA = true;
  //       console.log("Recipient has USDC account");
  //     } catch (error) {
  //       if (error instanceof TokenAccountNotFoundError) {
  //         recipientHasATA = false;
  //         console.log("Recipient needs USDC account creation");
  //       } else {
  //         console.error("Error checking recipient USDC account:", error);
  //         throw error;
  //       }
  //     }

  //     // Calculate required fees
  //     const LAMPORTS_FOR_ATA = 0.002 * LAMPORTS_PER_SOL;
  //     const LAMPORTS_FOR_TRANSFER = 0.000005 * LAMPORTS_PER_SOL;
  //     const requiredLamports = recipientHasATA
  //       ? LAMPORTS_FOR_TRANSFER
  //       : LAMPORTS_FOR_ATA + LAMPORTS_FOR_TRANSFER;

  //     if (solBalance < requiredLamports) {
  //       throw new Error(
  //         `Insufficient SOL for transaction fees. Need ${(
  //           requiredLamports / LAMPORTS_PER_SOL
  //         ).toFixed(6)} SOL, have ${(solBalance / LAMPORTS_PER_SOL).toFixed(
  //           6
  //         )} SOL`
  //       );
  //     }

  //     setStatus("creating");

  //     // Calculate total amount from all invoices
  //     const totalAmount = vendorData.invoices.reduce(
  //       (sum, invoice) => sum + invoice.amount,
  //       0
  //     );

  //     // Check USDC balance
  //     try {
  //       const senderUsdcAddress = await getAssociatedTokenAddress(
  //         new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  //         publicKey
  //       );
  //       const senderAccount = await getAccount(
  //         heliusConnection,
  //         senderUsdcAddress
  //       );
  //       const usdcBalance = Number(senderAccount.amount) / 10 ** 6;
  //       console.log("Sender USDC balance:", usdcBalance);

  //       if (usdcBalance < totalAmount) {
  //         throw new Error(
  //           `Insufficient USDC balance. Have ${usdcBalance}, need ${totalAmount}`
  //         );
  //       }
  //     } catch (error) {
  //       console.error("Error checking USDC balance:", error);
  //       if (error instanceof TokenAccountNotFoundError) {
  //         throw new Error("You don't have a USDC token account");
  //       }
  //       throw new Error("Failed to check USDC balance");
  //     }

  //     // Create transaction
  //     const { transaction, blockhash, lastValidBlockHeight } =
  //       await createUsdcTransferTransaction({
  //         amount: totalAmount,
  //         recipientWallet: new PublicKey(vendorInfo.ownerAddress),
  //         connection: heliusConnection,
  //         publicKey,
  //       });

  //     console.log("Transaction created, proceeding to sign");
  //     setStatus("confirming");

  //     // Sign transaction
  //     const signedTx = await signTransaction(transaction);
  //     console.log("Transaction signed");

  //     // Send transaction using wallet's connection
  //     const signature = await heliusConnection.sendRawTransaction(
  //       signedTx.serialize(),
  //       {
  //         skipPreflight: true,
  //         maxRetries: 5,
  //       }
  //     );

  //     console.log("Transaction sent:", signature);

  //     // Wait for confirmation using a more robust strategy
  //     try {
  //       // const confirmation = await heliusConnection.confirmTransaction(
  //       //   {
  //       //     signature,
  //       //     blockhash,
  //       //     lastValidBlockHeight,
  //       //   },
  //       //   "confirmed"
  //       // );

  //       // if (confirmation.value.err) {
  //       //   throw new Error(`Transaction failed: ${confirmation.value.err}`);
  //       // }

  //       // // Double check the transaction
  //       // const txResult = await heliusConnection.getTransaction(signature, {
  //       //   maxSupportedTransactionVersion: 0,
  //       // });

  //       // if (!txResult) {
  //       //   throw new Error("Transaction confirmation failed");
  //       // }

  //       console.log("Transaction confirmed");
  //       // Store transaction record
  //       const transactionRecord = {
  //         signature,
  //         timestamp: Date.now(),
  //         invoices: vendorData.invoices,
  //         vendor: vendorData.vendor,
  //         additionalInfo: vendorData.additionalInfo,
  //         paymentMethod: paymentData.paymentMethod,
  //         amount: totalAmount,
  //         recipientAddress: vendorInfo.ownerAddress,
  //         senderAddress: publicKey.toString(),
  //         fees: {
  //           estimatedSol: requiredLamports / LAMPORTS_PER_SOL,
  //           createdATA: !recipientHasATA,
  //         },
  //       };

  //       console.log("Transaction record:", transactionRecord);

  //       setStatus("confirmed");
  //     } catch (error) {
  //       console.error("Error confirming transaction:", error);

  //       // Try to get the transaction status one more time
  //       try {
  //         const status = await connection.getSignatureStatus(signature);
  //         console.log("Final transaction status:", status);

  //         if (status.value?.err) {
  //           throw new Error(`Transaction failed: ${status.value.err}`);
  //         } else if (
  //           status.value?.confirmationStatus === "confirmed" ||
  //           status.value?.confirmationStatus === "finalized"
  //         ) {
  //           // Transaction actually succeeded
  //           setStatus("confirmed");
  //           return;
  //         }
  //       } catch (statusError) {
  //         console.error("Failed to get final transaction status:", statusError);
  //       }

  //       // If we got here, the transaction definitely failed
  //       throw new Error("Transaction failed to confirm");
  //     }
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
