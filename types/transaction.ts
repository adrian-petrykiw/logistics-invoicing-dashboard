export interface TransactionParty {
  multisig_address: string;
  vault_address: string;
  wallet_address?: string; // Optional for recipient
}

export interface InvoiceProofData {
  invoice_number: string;
  encryption_key: string;
  payment_hash: string;
}

export interface ProofData {
  encryption_keys: Record<string, string>; // invoice_number -> encryption_key
  payment_hashes: Record<string, string>; // invoice_number -> payment_hash
}

export interface Invoice {
  number: string;
  amount: number;
  proof?: InvoiceProofData; // For internal use during transaction creation
}

export type TransactionStatus =
  | "draft" // Initial payment request state
  | "pending" // Payment requested, not yet paid
  | "processing" // Payment is being processed
  | "confirmed" // Transaction confirmed on chain
  | "finalized" // Transaction finalized on chain
  | "failed" // Transaction failed
  | "expired"; // Payment request expired

// Add supported payment methods
export type PaymentMethod =
  | "wire"
  | "ach"
  | "account_credit"
  | "debit_card"
  | "credit_card";

export interface TransactionRecord {
  id: string;
  organization_id: string;
  signature: string;
  token_mint: string;
  proof_data: ProofData;
  status: TransactionStatus;
  amount: number;
  transaction_type: "payment" | "transfer" | "other";
  sender: TransactionParty;
  recipient: TransactionParty;
  invoices: Invoice[];
  created_at: string;
  updated_at: string;
  created_by: string;
  due_date?: string;
  restricted_payment_methods?: PaymentMethod[]; // Changed from allowed_payment_methods
  metadata?: {
    payment_request?: {
      requester_info?: {
        name: string;
        email: string;
        company: string;
        address?: string;
        phone?: string;
      };
      notes?: string;
      custom_fields?: Record<string, any>;
    };
  };
}

export interface CreateTransactionDTO
  extends Omit<
    TransactionRecord,
    "id" | "created_at" | "updated_at" | "created_by"
  > {
  status: TransactionStatus;
}

export interface ApiError {
  error: string;
  code: string;
  details?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
