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

export interface TransactionRecord {
  id: string;
  organization_id: string;
  signature: string;
  token_mint: string;
  proof_data: ProofData;
  status: "pending" | "confirmed" | "failed";
  amount: number;
  transaction_type: "payment" | "transfer" | "other";
  sender: TransactionParty;
  recipient: TransactionParty;
  invoices: Invoice[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface CreateTransactionDTO
  extends Omit<
    TransactionRecord,
    "id" | "created_at" | "updated_at" | "status" | "created_by"
  > {}

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
