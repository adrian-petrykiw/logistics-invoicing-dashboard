interface PaymentRequestEmailProps {
  type: "requester" | "recipient";
  paymentRequest: any;
}

export function createPaymentRequestEmailHtml({
  type,
  paymentRequest,
}: PaymentRequestEmailProps): string {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  if (type === "requester") {
    return `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              /* Add your email styles here */
            </style>
          </head>
          <body>
            <h2>Payment Request Created</h2>
            <p>Your payment request has been created successfully.</p>
            
            <h3>Details:</h3>
            <ul>
              <li>Amount: ${formatCurrency(paymentRequest.amount)}</li>
              <li>Due Date: ${formatDate(paymentRequest.due_date)}</li>
              <li>Recipient: ${paymentRequest.recipient.name}</li>
            </ul>
  
            <h3>Invoices:</h3>
            <ul>
              ${paymentRequest.invoices
                .map(
                  (invoice: any) => `
                <li>Invoice #${invoice.number}: ${formatCurrency(
                    invoice.amount
                  )}</li>
              `
                )
                .join("")}
            </ul>
  
            <p>The recipient will be notified via email.</p>
          </body>
        </html>
      `;
  }

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            /* Add your email styles here */
          </style>
        </head>
        <body>
          <h2>New Payment Request</h2>
          <p>You have received a new payment request.</p>
          
          <h3>Details:</h3>
          <ul>
            <li>Amount: ${formatCurrency(paymentRequest.amount)}</li>
            <li>Due Date: ${formatDate(paymentRequest.due_date)}</li>
            <li>Requester: ${paymentRequest.sender.name}</li>
          </ul>
  
          <h3>Invoices:</h3>
          <ul>
            ${paymentRequest.invoices
              .map(
                (invoice: any) => `
              <li>Invoice #${invoice.number}: ${formatCurrency(
                  invoice.amount
                )}</li>
            `
              )
              .join("")}
          </ul>
  
          <p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/payment-requests/${
    paymentRequest.id
  }">
              Click here to view and process the payment request
            </a>
          </p>
        </body>
      </html>
    `;
}
