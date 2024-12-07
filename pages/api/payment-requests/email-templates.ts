interface PaymentRequestEmailProps {
  type: "requester" | "recipient";
  paymentRequest: {
    id: string;
    amount: number;
    due_date: string;
    metadata?: {
      payment_request?: {
        creator_email?: string;
        notes?: string;
      };
    };
    organization_id?: string;
    organization?: {
      name?: string;
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

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f8f9fa;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
          }
          .logo {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo img {
            height: 32px;
            width: auto;
          }
          h1 {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 24px;
            text-align: center;
          }
          .info-box {
            background-color: #f3f4f6;
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 24px;
          }
          .amount {
            font-size: 32px;
            font-weight: 600;
            margin-bottom: 8px;
          }
          .due-date {
            color: #6b7280;
            margin-bottom: 24px;
          }
          .details {
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .details:last-child {
            margin-bottom: 0;
          }
          .details-title {
            font-weight: 600;
            margin-bottom: 8px;
          }
          .invoice-amount {
            text-align: right;
          }
          .button {
            display: inline-block;
            width: 100%;
            padding: 16px 24px;
            background-color: #000000;
            color: #FFFFFF !important;
            text-decoration: none;
            border-radius: 8px;
            text-align: center;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 12px;
            box-sizing: border-box;
            margin-top: 24px;
          }
          .footer {
            text-align: center;
            color: #6b7280;
            font-size: 14px;
            margin-top: 40px;
          }
          @media (max-width: 600px) {
            .container {
              padding: 24px 16px;
            }
            .amount {
              font-size: 28px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="https://cargobill.co/logo-horizontal.svg" alt="Company Logo">           
          </div>
          
          <h1>You have a new payment request</h1>
          
          <div class="info-box">
            <div class="amount">${formatCurrency(paymentRequest.amount)}</div>
            <div class="due-date">Due by ${formatDate(
              paymentRequest.due_date
            )}</div>
            
            <div class="details">
              <div class="details-title">${
                type === "requester" ? "Recipient" : "Requester"
              }:</div>
              <div>
                <strong>${
                  paymentRequest.organization?.name || "N/A"
                }</strong><br>
                ${
                  paymentRequest.metadata?.payment_request?.creator_email ||
                  "No email provided"
                }
              </div>
            </div>

            <div class="details">
              <div class="details-title">Invoices:</div>
              ${paymentRequest.invoices
                .map(
                  (invoice) =>
                    `<div class="details">
                  <div>Invoice #${invoice.number}</div>
                  <div class="invoice-amount">${formatCurrency(
                    invoice.amount
                  )}</div>
                </div>`
                )
                .join("")}
            </div>

            ${
              paymentRequest.metadata?.payment_request?.notes
                ? `
              <div class="details">
                <div class="details-title">Notes:</div>
                <div>${paymentRequest.metadata.payment_request.notes}</div>
              </div>
            `
                : ""
            }

            ${
              type === "recipient"
                ? `<a href="/payment-requests/${paymentRequest.id}" class="button">
                MAKE PAYMENT
              </a>`
                : ""
            }
          </div>

          <div class="footer">
            CargoBill Inc. 2024
          </div>
        </div>
      </body>
    </html>
  `;
}
