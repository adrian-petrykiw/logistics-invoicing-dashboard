import { useRouter } from "next/router";
import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import Link from "next/link";
import { FileIcon } from "lucide-react";
import { usePaymentRequest } from "@/features/payment-requests/hooks/usePaymentRequest";

export default function PaymentRequestPage() {
  const router = useRouter();
  const { id } = router.query;
  const { connected } = useWallet();
  const { user, isAuthenticated } = useAuth();
  const {
    data: paymentRequest,
    isLoading,
    error,
  } = usePaymentRequest(id as string);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto py-12 px-4">
          <div className="space-y-8">
            <Skeleton className="h-8 w-72 mx-auto" />
            <Card>
              <CardContent className="p-6 space-y-6">
                <Skeleton className="h-12 w-32" />
                <Skeleton className="h-4 w-48" />
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !paymentRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Payment Request Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            The payment request you&apos;re looking for doesn&apos;t exist or
            has been removed.
          </p>
          <Link href="/">
            <Button variant="outline">Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="space-y-4">
          <div className="text-start">
            <h1 className="text-xl font-semibold text-gray-900">
              Payment Request Details
            </h1>
          </div>

          <Card>
            <CardContent className="p-6 space-y-6">
              <div>
                <div className="text-3xl font-bold text-gray-900">
                  ${paymentRequest.amount.toFixed(2)}
                </div>
                <div className="text-gray-600 mt-1">
                  Due by{" "}
                  {format(new Date(paymentRequest.due_date), "MMMM d, yyyy")}
                </div>
              </div>

              {/* Sender and Recipient Info */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      From:
                    </h3>
                    <div className="text-sm text-gray-600">
                      <p className="font-medium">
                        {
                          paymentRequest.sender.organization?.business_details
                            .companyName
                        }
                      </p>
                      <p>
                        {
                          paymentRequest.sender.organization?.business_details
                            .companyEmail
                        }
                      </p>
                      {paymentRequest.sender.organization?.business_details
                        .companyAddress && (
                        <p>
                          {
                            paymentRequest.sender.organization.business_details
                              .companyAddress
                          }
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      To:
                    </h3>
                    <div className="text-sm text-gray-600">
                      <p className="font-medium">
                        {
                          paymentRequest.recipient.organization
                            ?.business_details.companyName
                        }
                      </p>
                      <p>
                        {
                          paymentRequest.recipient.organization
                            ?.business_details.companyEmail
                        }
                      </p>
                      {paymentRequest.recipient.organization?.business_details
                        .companyAddress && (
                        <p>
                          {
                            paymentRequest.recipient.organization
                              .business_details.companyAddress
                          }
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoices */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Invoices:
                </h3>
                <div className="space-y-3">
                  {paymentRequest.invoices.map((invoice) => (
                    <div
                      key={invoice.number}
                      className="flex items-start justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Invoice {invoice.number}
                        </p>
                        {invoice.files && invoice.files.length > 0 && (
                          <div className="mt-1 space-x-2">
                            {invoice.files.map((file) => (
                              <a
                                key={file.url}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800"
                              >
                                <FileIcon className="h-3 w-3 mr-1" />
                                {file.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-gray-900">
                        ${invoice.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {paymentRequest.metadata?.payment_request?.notes && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Notes:
                  </h3>
                  <p className="text-sm text-gray-600">
                    {paymentRequest.metadata.payment_request.notes}
                  </p>
                </div>
              )}

              {/* Payment Action */}
              <div className="border-t pt-6">
                {!connected || !isAuthenticated ? (
                  <Button className="w-full" size="lg">
                    Login/Signup to Pay
                  </Button>
                ) : (
                  <Button className="w-full" size="lg">
                    Make Payment
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
