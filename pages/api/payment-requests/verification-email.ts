interface VerificationEmailProps {
  code: string;
  organizationName: string;
  email: string;
}

export function createVerificationEmailHtml({
  code,
  organizationName,
  email,
}: VerificationEmailProps): string {
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
              height: 64px;
              width: auto;
            }
            h2 {
              font-size: 21px;
              font-weight: 600;
              color: #1f2937;
              margin-bottom: 16px;
              text-align: center;
            }
            .info-box {
              background-color: #f3f4f6;
              border-radius: 8px;
              padding: 24px;
              margin-bottom: 24px;
              text-align: center;
            }
            .verification-code {
              font-size: 32px;
              font-weight: 600;
              letter-spacing: 4px;
              margin: 24px 0;
              color: #000;
            }
            .section {
              margin-bottom: 20px;
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
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <img src="https://cargobill.co/logo-horizontal.png" alt="CargoBill Logo">           
            </div>
            
            <h2>Verify Your Organization Email</h2>
            
            <div class="info-box">
              <p>Please use the following code to verify your organization email address:</p>
              
              <div class="verification-code">${code}</div>
              
              <p>This code will expire in 10 minutes.</p>
            </div>
  
            <div class="section">
              <p>Organization: ${organizationName}<br>
              Email: ${email}</p>
            </div>
  
            <div class="footer">
              CargoBill Inc. 2024<br>
              <small>If you didn't request this verification, please ignore this email.</small>
            </div>
          </div>
        </body>
      </html>
    `;
}
