export interface TransactionParty {
  multisig_address: string;
  vault_address: string;
  wallet_address?: string; // Optional for recipient
}

export interface ProofData {
  encryption_keys: Record<string, string>;
  payment_hashes: Record<string, string>;
}

export interface Invoice {
  number: string;
  amount: number;
  files?: string[]; // For storing uploaded file URLs
}

export type TransactionStatus =
  | "draft"
  | "open"
  | "pending"
  | "processing"
  | "confirmed"
  | "failed"
  | "expired";

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
  transaction_type: "payment" | "transfer" | "request" | "other";
  sender: TransactionParty;
  recipient: TransactionParty;
  invoices: Invoice[];
  created_at: string;
  updated_at: string;
  created_by: string;
  due_date?: string;
  restricted_payment_methods?: PaymentMethod[];
  metadata?: {
    payment_request?: {
      notes?: string;
      creator_email?: string;
      creator_wallet_address?: string;
      creator_organization_id?: string;
      creator_organization_name?: string;
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
