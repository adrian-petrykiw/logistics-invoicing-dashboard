import {
  Connection,
  PublicKey,
  TransactionMessage,
  TransactionInstruction,
  Keypair,
} from "@solana/web3.js";
import * as multisig from "@sqds/multisig";
// import { ReclaimProofRequest } from "@reclaimprotocol/js-sdk";
import {
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { ApiResponse, VendorInfo, VendorDetails } from "@/types/vendor";
import { getMultisigPda, getVaultPda } from "@sqds/multisig";
import { getAuthHeaders } from "@/hooks/useApi";
import { getApiUser } from "@/utils/user";
import { solanaService } from "./solana";
import { createCipheriv, createHash, randomBytes } from "crypto";
import bs58 from "bs58";
import { MEMO_PROGRAM_ID, USDC_MINT } from "@/utils/constants";

interface BusinessData {
  vendor: string;
  additionalInfo?: string;
  paymentMethod: string;
  timestamp: number;
  vendorMultisig: string;
}

interface InvoiceData {
  number: string;
  amount: number;
  recipient: string;
}

export class TransactionService {
  static async fetchVendorDetails(
    vendorId: string,
    headers: Record<string, string>
  ): Promise<VendorInfo> {
    console.log("Fetching vendor details for ID:", vendorId);

    const vendorResponse = await fetch(`/api/vendors/${vendorId}`, {
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
    });

    if (!vendorResponse.ok) {
      const errorText = await vendorResponse.text();
      console.error("Vendor fetch error:", errorText);
      throw new Error("Failed to fetch vendor details");
    }

    const vendorData =
      (await vendorResponse.json()) as ApiResponse<VendorDetails>;
    console.log("Vendor response data:", vendorData);

    if (!vendorData.success || !vendorData.data) {
      throw new Error(
        vendorData.error?.error || "Failed to fetch vendor details"
      );
    }

    // Get the vendor's public key
    const vendorPublicKey = new PublicKey(
      vendorData.data.business_details.ownerWalletAddress
    );

    // Derive the vendor's multisig and vault addresses
    // const createKey = PublicKey.findProgramAddressSync(
    //   [Buffer.from("squad"), vendorPublicKey.toBuffer()],
    //   new PublicKey("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf")
    // )[0];

    const [multisigPda] = getMultisigPda({
      createKey: vendorPublicKey,
    });

    const [vaultPda] = getVaultPda({
      multisigPda,
      index: 0,
    });

    return {
      name: vendorData.data.business_details.companyName,
      multisigAddress: multisigPda.toBase58(),
      vaultAddress: vaultPda.toBase58(),
      ownerAddress: vendorData.data.business_details.ownerWalletAddress,
    };
  }

  // private static async generateConsolidatedProof(
  //   businessData: BusinessData,
  //   invoices: InvoiceData[]
  // ): Promise<string> {
  //   const reclaimRequest = await ReclaimProofRequest.init(
  //     process.env.NEXT_PUBLIC_RECLAIM_APP_ID!,
  //     process.env.NEXT_PUBLIC_RECLAIM_APP_SECRET!,
  //     process.env.NEXT_PUBLIC_RECLAIM_PROVIDER_ID!
  //   );

  //   const proofData = {
  //     businessData,
  //     invoices,
  //     timestamp: Date.now(),
  //   };

  //   reclaimRequest.addContext("payment-data", JSON.stringify(proofData));
  //   return reclaimRequest.toJsonString();
  // }

  private static async createInvoiceInstructions(
    vaultPda: PublicKey,
    recipientAddress: string,
    amount: number,
    invoiceNumber: string,
    proofJson: string
  ): Promise<TransactionInstruction[]> {
    const recipientPubkey = new PublicKey(recipientAddress);
    const fromATA = await getAssociatedTokenAddress(USDC_MINT, vaultPda, true);
    const toATA = await getAssociatedTokenAddress(
      USDC_MINT,
      recipientPubkey,
      true
    );

    const transferInstruction = createTransferInstruction(
      fromATA,
      toATA,
      vaultPda,
      BigInt(Math.round(amount * 1e6))
    );

    const memoData = JSON.stringify({
      invoice: invoiceNumber,
      proof: proofJson,
      schema: "PAYMENT_V1",
    });

    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memoData),
    });

    return [transferInstruction, memoInstruction];
  }

  // 1. Generate consolidated proof
  // const proofJson = await this.generateConsolidatedProof(
  //   businessData,
  //   invoices
  // );

  private static encryptData(data: any): { encrypted: string; key: string } {
    // Create a random encryption key
    const key = randomBytes(32);
    const iv = randomBytes(16);

    // Create cipher
    const cipher = createCipheriv("aes-256-cbc", key, iv);

    // Encrypt the data
    let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
    encrypted += cipher.final("hex");

    // Return both the encrypted data and the key (both needed for decryption)
    return {
      encrypted: iv.toString("hex") + ":" + encrypted,
      key: key.toString("hex"),
    };
  }

  private static generateProof(
    businessData: BusinessData,
    invoices: InvoiceData[]
  ): { proofJson: string; encryptionKey: string } {
    const proofData = {
      businessData,
      invoices,
      timestamp: Date.now(),
    };

    // Create a hash of the data for verification
    const dataHash = createHash("sha256")
      .update(JSON.stringify(proofData))
      .digest("hex");

    // Encrypt the data
    const { encrypted, key } = this.encryptData(proofData);

    const proof = {
      data: encrypted,
      hash: dataHash,
      version: "1.0",
    };

    return {
      proofJson: JSON.stringify(proof),
      encryptionKey: key,
    };
  }

  static async createAndExecuteTransaction(params: {
    connection: Connection;
    multisigPda: PublicKey;
    vaultPda: PublicKey;
    invoices: InvoiceData[];
    businessData: BusinessData;
    senderPublicKey: PublicKey;
  }) {
    const {
      connection,
      multisigPda,
      vaultPda,
      invoices,
      businessData,
      senderPublicKey,
    } = params;

    try {
      console.log("Verifying multisig setup:", {
        multisigPda: multisigPda.toString(),
        vaultPda: vaultPda.toString(),
      });

      // First, try to get the multisig account to verify it exists
      let multisigInfo;
      let dMultiSigPda;
      let dVaultPda;
      try {
        const createKey = PublicKey.findProgramAddressSync(
          [Buffer.from("squad"), senderPublicKey.toBuffer()],
          new PublicKey("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf")
        )[0];

        // Get PDA info to help debug
        const [derivedMultisigPda] = multisig.getMultisigPda({
          createKey: createKey,
        });

        dMultiSigPda = derivedMultisigPda;

        if (!derivedMultisigPda) {
          throw Error("Failed to find multisgPda");
        }

        console.log("dMultiSigPda: ", dMultiSigPda);

        const [vaultPda] = getVaultPda({
          multisigPda: derivedMultisigPda,
          index: 0,
        });

        dVaultPda = vaultPda;

        console.log("dVaultPda: ", dVaultPda);

        // multisigInfo = await multisig.accounts.Multisig.fromAccountAddress(
        //   connection,
        //   derivedMultisigPda
        // );

        // console.log("Found multisig account:", {
        //   configAuthority: multisigInfo.configAuthority.toString(),
        //   threshold: multisigInfo.threshold.toString(),
        //   transactionIndex: multisigInfo.transactionIndex.toString(),
        //   createKey: multisigInfo.createKey.toString(),
        // });
      } catch (err: any) {
        console.error(
          "Failed to find multisig account, attempting to verify PDA derivation"
        );

        const createKey = PublicKey.findProgramAddressSync(
          [Buffer.from("squad"), senderPublicKey.toBuffer()],
          new PublicKey("SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf")
        )[0];

        const [vaultPda] = getVaultPda({
          multisigPda,
          index: 0,
        });

        // Get PDA info to help debug
        const [derivedMultisigPda] = multisig.getMultisigPda({
          createKey: createKey,
        });

        console.log("PDA verification:", {
          provided: multisigPda.toString(),
          derived: derivedMultisigPda.toString(),
        });

        throw new Error(`Multisig account verification failed: ${err.message}`);
      }

      // Generate proof and create instructions
      const { proofJson, encryptionKey } = this.generateProof(
        businessData,
        invoices
      );

      const allInstructions: TransactionInstruction[] = [];
      for (const invoice of invoices) {
        const instructions = await this.createInvoiceInstructions(
          dVaultPda,
          invoice.recipient,
          invoice.amount,
          invoice.number,
          proofJson
        );
        allInstructions.push(...instructions);
      }

      // Use transaction index 1 for simplicity (as shown in SDK example)
      // This is fine for testing but in production you'd want to track indices
      const transactionIndex = BigInt(1);
      console.log("Using transaction index:", transactionIndex.toString());

      // Create transaction message
      const message = new TransactionMessage({
        payerKey: dVaultPda,
        recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
        instructions: allInstructions,
      });

      const adminKeypair = Keypair.fromSecretKey(
        bs58.decode(process.env.NEXT_PUBLIC_CB_SERVER_MVP_PK!)
      );

      if (!process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
        throw Error("No RPC");
      }

      const localConnection = new Connection(
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL!,
        "confirmed"
      );

      // Create the vault transaction
      console.log("Creating vault transaction...");
      const txCreateSignature = await multisig.rpc.vaultTransactionCreate({
        connection: localConnection,
        feePayer: adminKeypair,
        multisigPda: dMultiSigPda,
        transactionIndex,
        creator: senderPublicKey,
        vaultIndex: 0,
        ephemeralSigners: 0,
        transactionMessage: message,
        memo: proofJson,
      });

      // Use new confirmation method
      const createStatus = await solanaService.confirmTransactionWithRetry(
        txCreateSignature,
        "confirmed",
        5,
        30000,
        localConnection
      );

      if (createStatus?.err) {
        throw new Error(
          `Failed to create vault transaction: ${createStatus.err}`
        );
      }

      console.log("Created vault transaction:", txCreateSignature);

      // Since this is a controlled multisig, we can execute right away
      console.log("Executing vault transaction...");
      const txExecuteSignature = await multisig.rpc.vaultTransactionExecute({
        connection,
        feePayer: adminKeypair,
        multisigPda: dMultiSigPda,
        transactionIndex,
        member: senderPublicKey,
        sendOptions: { skipPreflight: true },
      });

      // Use new confirmation method for execution
      const executeStatus = await solanaService.confirmTransactionWithRetry(
        txExecuteSignature,
        "confirmed",
        5,
        30000,
        connection
      );

      if (executeStatus?.err) {
        throw new Error(
          `Failed to execute vault transaction: ${executeStatus.err}`
        );
      }

      console.log("Executed vault transaction:", txExecuteSignature);

      return {
        createSignature: txCreateSignature,
        executeSignature: txExecuteSignature,
        proofJson,
        encryptionKey,
        status: executeStatus,
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Transaction error:", {
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  // static async createAndExecuteTransaction(params: {
  //   connection: Connection;
  //   multisigPda: PublicKey;
  //   vaultPda: PublicKey;
  //   invoices: InvoiceData[];
  //   businessData: BusinessData;
  //   wallet: any;
  // }) {
  //   const {
  //     connection,
  //     multisigPda,
  //     vaultPda,
  //     invoices,
  //     businessData,
  //     wallet,
  //   } = params;

  //   try {
  //     // 1. Generate proof
  //     const { proofJson, encryptionKey } = this.generateProof(
  //       businessData,
  //       invoices
  //     );

  //     // 2. Create instructions for each invoice
  //     const allInstructions: TransactionInstruction[] = [];
  //     for (const invoice of invoices) {
  //       const instructions = await this.createInvoiceInstructions(
  //         vaultPda,
  //         invoice.recipient,
  //         invoice.amount,
  //         invoice.number,
  //         proofJson
  //       );
  //       allInstructions.push(...instructions);
  //     }

  //     // Rest of the transaction creation code...
  //     const multisigInfo = await multisig.accounts.Multisig.fromAccountAddress(
  //       connection,
  //       multisigPda
  //     );
  //     const newTransactionIndex = BigInt(
  //       Number(multisigInfo.transactionIndex) + 1
  //     );

  //     const message = new TransactionMessage({
  //       payerKey: vaultPda,
  //       recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
  //       instructions: allInstructions,
  //     });

  //     const signature = await multisig.rpc.vaultTransactionCreate({
  //       connection,
  //       feePayer: wallet,
  //       multisigPda,
  //       transactionIndex: newTransactionIndex,
  //       creator: wallet.publicKey,
  //       vaultIndex: 0,
  //       ephemeralSigners: 0,
  //       transactionMessage: message,
  //       memo: proofJson,
  //     });

  //     await solanaService.confirmTransactionWithRetry(signature);

  //     // Store transaction in database
  //     const transactionRecord = await fetch("/api/transactions", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         // Add auth headers if needed
  //       },
  //       body: JSON.stringify({
  //         organization_id: businessData.vendorMultisig,
  //         signature,
  //         proof_json: {
  //           encrypted_data: proofJson,
  //           encryption_key: encryptionKey, // Store this securely!
  //         },
  //         amount: invoices.reduce((sum, inv) => sum + inv.amount, 0),
  //         transaction_type: "payment",
  //         status: "pending",
  //         sender_address: vaultPda.toString(),
  //         recipient_address: invoices[0].recipient,
  //         invoices: invoices.map(({ number, amount }) => ({ number, amount })),
  //         business_data: businessData,
  //       }),
  //     });

  //     if (!transactionRecord.ok) {
  //       throw new Error("Failed to store transaction record");
  //     }

  //     return {
  //       signature,
  //       proofJson,
  //       transactionIndex: newTransactionIndex,
  //       encryptionKey, // Return this so it can be stored securely
  //     };
  //   } catch (error) {
  //     console.error("Transaction creation error:", error);
  //     throw error;
  //   }
  // }

  static async getTransactionsByOrganization(organizationId: string) {
    const response = await fetch(
      `/api/transactions?organization_id=${organizationId}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch transactions");
    }
    const data = await response.json();
    return data.data;
  }

  static async getTransactionDetails(transactionId: string) {
    const response = await fetch(`/api/transactions/${transactionId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch transaction details");
    }
    const data = await response.json();
    return data.data;
  }

  static async updateTransactionStatus(
    transactionId: string,
    status: "confirmed" | "failed"
  ) {
    const response = await fetch(`/api/transactions/${transactionId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error("Failed to update transaction status");
    }

    const data = await response.json();
    return data.data;
  }
}
