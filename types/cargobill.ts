export interface TransactionRecord {
  id: string;
  organization_id: string;
  signature: string;
  proof_json: string;
  status: "pending" | "confirmed" | "failed";
  amount: number;
  created_at: string;
  updated_at: string;
  transaction_type: "payment" | "transfer" | "request" | "other";
  sender_address: string;
  recipient_address: string;
  invoices: {
    number: string;
    amount: number;
  }[];
  business_data: Record<string, any>;
}

export interface CreateTransactionInput {
  organization_id: string;
  signature: string;
  proof_json: string;
  amount: number;
  transaction_type: TransactionRecord["transaction_type"];
  sender_address: string;
  recipient_address: string;
  invoices: TransactionRecord["invoices"];
  business_data: TransactionRecord["business_data"];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    error: string;
    code: string;
    details?: any;
  };
}
