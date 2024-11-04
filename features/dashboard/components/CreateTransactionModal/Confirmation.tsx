import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface ConfirmationProps {
  onClose: () => void;
  onBack: () => void;
  vendorData: any;
  paymentData: any;
}

export function Confirmation({
  onClose,
  onBack,
  vendorData,
  paymentData,
}: ConfirmationProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Vendor & Shipping Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium text-sm">Vendor</p>
              <p className="text-sm text-muted-foreground">
                {vendorData?.vendor}
              </p>
            </div>
            <div>
              <p className="font-medium text-sm">Bill of Lading</p>
              <p className="text-sm text-muted-foreground">
                {vendorData?.billOfLading}
              </p>
            </div>
            <div>
              <p className="font-medium text-sm">Sender</p>
              <p className="text-sm text-muted-foreground">
                {vendorData?.sender}
              </p>
            </div>
            <div>
              <p className="font-medium text-sm">Receiver</p>
              <p className="text-sm text-muted-foreground">
                {vendorData?.receiver}
              </p>
            </div>
            <div>
              <p className="font-medium text-sm">Origin</p>
              <p className="text-sm text-muted-foreground">
                {vendorData?.origin}
              </p>
            </div>
            <div>
              <p className="font-medium text-sm">Destination</p>
              <p className="text-sm text-muted-foreground">
                {vendorData?.destination}
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Payment Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-medium text-sm">Payment Method</p>
              <p className="text-sm text-muted-foreground">
                {paymentData?.paymentMethod}
              </p>
            </div>
            <div>
              <p className="font-medium text-sm">Amount</p>
              <p className="text-sm text-muted-foreground">
                ${paymentData?.amount?.toFixed(2)}
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
