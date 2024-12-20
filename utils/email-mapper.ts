import { EmailTemplatePaymentRequest } from "@/types/email";
import { TransactionRecord } from "@/types/transaction";

export function mapTransactionToEmailTemplate(
  transaction: TransactionRecord
): EmailTemplatePaymentRequest {
  return {
    id: transaction.id,
    amount: transaction.amount,
    due_date: transaction.due_date || "",
    metadata: {
      payment_request: {
        creator_email: transaction.metadata?.payment_request?.creator_email,
        creator_organization_name:
          transaction.metadata?.payment_request?.creator_organization_name,
        notes: transaction.metadata?.payment_request?.notes,
      },
    },
    invoices: transaction.invoices,
  };
}
