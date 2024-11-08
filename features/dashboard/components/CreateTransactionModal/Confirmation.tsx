import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useVendorDetails } from "@/hooks/useVendorDetails";
import { CombinedFormValues } from "@/schemas/combinedform";
import { PaymentDetailsFormValues } from "@/schemas/paymentdetails";

interface ConfirmationProps {
  onClose: () => void;
  onBack: () => void;
  vendorData: CombinedFormValues;
  paymentData: PaymentDetailsFormValues & { amount: number };
}

export function Confirmation({
  onClose,
  onBack,
  vendorData,
  paymentData,
}: ConfirmationProps) {
  const { data: vendorDetails, isLoading } = useVendorDetails(
    vendorData?.vendor
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
        <div className="space-y-4 pb-4">
          <h2 className="text-lg font-semibold">Vendor & Shipping Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <p className="font-medium text-sm pb-2">Vendor</p>
              <Card className="bg-muted/50 rounded-md">
                <CardContent className="p-4">
                  {!vendorData?.vendor ? (
                    <div className="text-sm text-muted-foreground justify-center p-4 items-center text-center">
                      Vendor not found
                    </div>
                  ) : isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-2 w-[250px]" />
                      <Skeleton className="h-2 w-[200px]" />
                      <Skeleton className="h-2 w-[150px]" />
                    </div>
                  ) : vendorDetails ? (
                    <div className="p-0 m-0">
                      <h4 className="font-semibold text-sm">
                        {vendorDetails.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {vendorDetails.address}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {vendorDetails.phone}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
            <div>
              <div className="flex justify-between">
                <p className="font-medium text-sm mb-2">Invoices</p>
              </div>{" "}
              <p className="text-sm text-muted-foreground space-y-2">
                {vendorData?.invoices.map((invoice, index) => (
                  <Card className="bg-muted/50 rounded-md">
                    <CardContent className="flex w-full justify-between items-center h-full m-0 px-4 py-2">
                      <p>#{invoice.number}</p>
                      <p>{invoice.amount} USDC</p>
                    </CardContent>
                  </Card>
                ))}
              </p>
            </div>
            <div>
              <p className="font-medium text-sm mb-2">Related BOL/AWB #</p>
              <p className="text-sm text-muted-foreground">
                {vendorData?.relatedBolAwb}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Payment Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium text-sm mb-2">Payment Method</p>
              <p className="text-sm text-muted-foreground">
                {paymentData.paymentMethod.toLocaleUpperCase()}
              </p>
            </div>
            <div>
              <p className="font-medium text-sm mb-2 justify-end text-end w-full">
                {" "}
                Total Amount
              </p>
              <p className="text-sm text-muted-foreground justify-end text-end w-full">
                ${paymentData.amount.toFixed(2)}
              </p>
            </div>
            {paymentData?.paymentMethod === "ach" && (
              <>
                <div>
                  <p className="font-medium text-sm">Account Name</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentData?.accountName}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-sm">Account Type</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentData?.accountType}
                  </p>
                </div>
              </>
            )}

            {paymentData?.paymentMethod === "wire" && (
              <>
                <div>
                  <p className="font-medium text-sm">Bank Name</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentData?.bankName}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-sm">Swift Code</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentData?.swiftCode}
                  </p>
                </div>
              </>
            )}

            {(paymentData?.paymentMethod === "credit_card" ||
              paymentData?.paymentMethod === "debit_card") && (
              <>
                <div>
                  <p className="font-medium text-sm">Card Holder</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentData?.billingName}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-sm">Billing Address</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentData?.billingAddress}, {paymentData?.billingCity},{" "}
                    {paymentData?.billingState} {paymentData?.billingZip}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-background mt-auto">
        <div className="flex gap-4">
          <Button
            onClick={onBack}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700"
            variant="secondary"
          >
            Back
          </Button>
          <Button onClick={onClose} className="flex-1">
            Confirm & Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
