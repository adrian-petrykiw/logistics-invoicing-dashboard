import { useMutation, UseMutationResult } from "@tanstack/react-query";
import {
  Connection,
  PublicKey,
  Transaction,
  SendTransactionError,
  SignatureStatus,
} from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import { CreateMultisigResult } from "@/features/settings/components/RegistrationModal";
import {
  CreateMultisigInput,
  CreateMultisigInputSchema,
} from "@/schemas/squads";
import bs58 from "bs58";
import { solanaService } from "@/services/solana";

export function useCreateMultisig(): UseMutationResult<
  CreateMultisigResult,
  Error,
  CreateMultisigInput,
  unknown
> {
  const { publicKey, signTransaction } = useWallet();

  return useMutation({
    mutationFn: async (input: CreateMultisigInput) => {
      if (!publicKey || !signTransaction)
        throw new Error("Wallet not connected");
      CreateMultisigInputSchema.parse(input);

      try {
        const response = await fetch("/api/create-multisig", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userWalletAddress: publicKey.toBase58(),
            email: input.email,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create multisig");
        }

        const data = await response.json();

        // Check if multisig already exists from API response
        if (data.exists) {
          return {
            signature: "existing",
            multisigPda: new PublicKey(data.multisigPda),
            createKey: new PublicKey(data.createKey),
          };
        }

        // Deserialize the partial transaction
        const connection = new Connection(
          process.env.NEXT_PUBLIC_SOLANA_RPC_URL!,
          "confirmed"
        );
        const recoveredTransaction = Transaction.from(
          bs58.decode(data.serializedTransaction)
        );

        // Sign with the connected wallet (createKey)
        const signedTransaction = await signTransaction(recoveredTransaction);

        try {
          // Send and confirm the fully signed transaction
          const signature = await connection.sendRawTransaction(
            signedTransaction.serialize(),
            { skipPreflight: false, maxRetries: 3 }
          );

          const status = await solanaService.confirmTransactionWithRetry(
            signature,
            "confirmed"
          );

          if (status && "err" in status && status.err) {
            const errorMessage = status.err.toString();
            if (errorMessage.includes("already in use")) {
              return {
                signature: "existing",
                multisigPda: new PublicKey(data.multisigPda),
                createKey: new PublicKey(data.createKey),
              };
            }
            throw new Error(`Transaction failed: ${errorMessage}`);
          }

          return {
            signature,
            multisigPda: new PublicKey(data.multisigPda),
            createKey: new PublicKey(data.createKey),
          };
        } catch (sendError: unknown) {
          // Handle SendTransactionError specifically
          if (sendError instanceof SendTransactionError) {
            const logs = sendError.logs;

            // Check if error is due to account already in use
            if (logs?.some((log) => log.includes("already in use"))) {
              return {
                signature: "existing",
                multisigPda: new PublicKey(data.multisigPda),
                createKey: new PublicKey(data.createKey),
              };
            }
          }
          throw sendError;
        }
      } catch (error) {
        console.error("Create multisig error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data.signature === "existing") {
        toast.success("Using existing vendor account");
      } else {
        toast.success("Vendor account created");
      }
    },
    onError: (error: Error) => {
      const errorMessage =
        error instanceof SendTransactionError
          ? `Failed to create multisig: Account already exists`
          : `Failed to create multisig: ${error.message}`;

      console.error(errorMessage);
      toast.error(`Failed to create multisig`);
    },
  });
}
