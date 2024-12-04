interface PaymentRequestEmailProps {
  type: "requester" | "recipient";
  paymentRequest: {
    id: string;
    amount: number;
    due_date: string;
    recipient: {
      name: string;
    };
    sender: {
      name: string;
    };
    invoices: Array<{
      number: string;
      amount: number;
    }>;
  };
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
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              h2 {
                color: #2563eb;
              }
              ul {
                padding-left: 20px;
              }
              li {
                margin-bottom: 8px;
              }
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
                  (invoice) => `
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
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            h2 {
              color: #2563eb;
            }
            ul {
              padding-left: 20px;
            }
            li {
              margin-bottom: 8px;
            }
            .button {
              display: inline-block;
              padding: 10px 20px;
              background-color: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              margin-top: 20px;
            }
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
                (invoice) => `
              <li>Invoice #${invoice.number}: ${formatCurrency(
                  invoice.amount
                )}</li>
            `
              )
              .join("")}
          </ul>
  
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/payment-requests/${
    paymentRequest.id
  }" class="button">
            View Payment Request
          </a>
        </body>
      </html>
    `;
}
