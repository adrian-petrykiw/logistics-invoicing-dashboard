import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaymentDetailsForm } from "./PaymentDetailsForm";
import { Confirmation } from "./Confirmation";
import { Progress } from "@/components/ui/progress";
import CombinedVendorForm from "./CombinedVendorForm";

interface CreateTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTransactionModal: React.FC<CreateTransactionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [step, setStep] = useState(0);
  const [vendorFormData, setVendorFormData] = useState<any>(null);
  const [paymentFormData, setPaymentFormData] = useState<any>(null);

  const handleClose = () => {
    onClose();
    setStep(0);
    setVendorFormData(null);
    setPaymentFormData(null);
  };

  const handleVendorSubmit = (data: any) => {
    setVendorFormData(data);
    setStep(1);
  };

  const handlePaymentSubmit = (data: any) => {
    setPaymentFormData(data);
    setStep(2);
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const steps = [
    {
      title: "1. Vendor & Shipping Details",
      component: <CombinedVendorForm onNext={handleVendorSubmit} />,
    },
    {
      title: "2. Payment Details",
      component: (
        <PaymentDetailsForm
          onNext={handlePaymentSubmit}
          onBack={handleBack}
          vendorFormData={vendorFormData}
        />
      ),
    },
    {
      title: "3. Confirmation",
      component: (
        <Confirmation
          onClose={onClose}
          onBack={handleBack}
          vendorData={vendorFormData}
          paymentData={paymentFormData}
        />
      ),
    },
  ];

  const progressPercentage =
    step < steps.length - 1
      ? ((step + 1) / steps.length) * 100 - 5
      : ((step + 1) / steps.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-full max-w-[90%] h-[90vh] p-0">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="text-2xl">Create Transaction</DialogTitle>
          </DialogHeader>

          <div className="flex space-x-4 justify-between w-full mt-4">
            {steps.map((stepItem, index) => (
              <div
                key={index}
                className={`step-indicator ${
                  index === step ? "text-quaternary" : "text-gray-400"
                } text-sm font-semibold text-start w-full`}
              >
                {stepItem.title}
              </div>
            ))}
          </div>
          <Progress value={progressPercentage} className="w-full mt-2" />
        </div>

        <div className="flex flex-col flex-1 h-[calc(90vh-180px)] px-6">
          <div className="flex-1 overflow-y-auto">{steps[step].component}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
