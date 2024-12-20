export interface EmailTemplatePaymentRequest {
  id: string;
  amount: number;
  due_date: string;
  metadata?: {
    payment_request?: {
      creator_email?: string;
      creator_organization_name?: string;
      notes?: string;
    };
  };
  invoices: Array<{
    number: string;
    amount: number;
  }>;
}

export interface PaymentRequestEmailProps {
  type: "requester" | "recipient";
  paymentRequest: EmailTemplatePaymentRequest;
}
