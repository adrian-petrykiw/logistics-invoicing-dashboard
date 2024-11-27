import { useState, useEffect } from "react";
import { useAvailableVendors } from "@/hooks/useVendorSelection";
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
import { useRouter } from "next/router";
import { PaymentDetailsFormValues } from "@/schemas/paymentdetails";
import { CombinedFormValues } from "@/schemas/combinedform";
import { VendorListItem } from "@/types/vendor";
import { useQueryClient } from "@tanstack/react-query";

interface CreateTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userWalletAddress: string;
  userEmail: string;
}

export const CreateTransactionModal: React.FC<CreateTransactionModalProps> = ({
  isOpen,
  onClose,
  userWalletAddress,
  userEmail,
}) => {
  const [step, setStep] = useState(0);
  const [vendorFormData, setVendorFormData] =
    useState<CombinedFormValues | null>(null);
  const [paymentFormData, setPaymentFormData] = useState<any>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: vendors = [],
    isLoading: isVendorsLoading,
    error: vendorsError,
    refetch: refetchVendors,
  } = useAvailableVendors();

  useEffect(() => {
    // Refetch vendors when modal opens
    if (isOpen) {
      refetchVendors();
    }
  }, [isOpen, refetchVendors]);

  if (!userWalletAddress) {
    router.push("/");
    return null;
  }

  const handleClose = () => {
    onClose();
    setStep(0);
    setVendorFormData(null);
    setPaymentFormData(null);
  };

  const handleTransactionComplete = async () => {
    // Invalidate and refetch balance queries
    await queryClient.invalidateQueries({
      queryKey: ["multisigBalance"],
    });
    await queryClient.invalidateQueries({
      queryKey: ["currency-conversion"],
    });

    // Reset modal state and close
    handleClose();
  };

  const handleVendorSubmit = (data: CombinedFormValues) => {
    console.log("Vendor Data:", data);
    setVendorFormData(data);
    setStep(1);
  };

  const handlePaymentSubmit = (
    data: PaymentDetailsFormValues,
    vendorData: CombinedFormValues
  ) => {
    console.log("Payment Data:", data);
    setPaymentFormData({ ...data, amount: vendorData.amount });
    setStep(2);
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const steps = [
    {
      title: "1. Vendor & Shipping Details",
      component: (
        <CombinedVendorForm
          userWalletAddress={userWalletAddress}
          onNext={handleVendorSubmit}
          availableVendors={vendors}
          isVendorsLoading={isVendorsLoading}
          vendorsError={vendorsError instanceof Error ? vendorsError : null}
          refetchVendors={refetchVendors}
        />
      ),
    },
    {
      title: "2. Payment Details",
      component: (
        <PaymentDetailsForm
          onNext={handlePaymentSubmit}
          onBack={handleBack}
          vendorFormData={vendorFormData!}
          userWalletAddress={userWalletAddress}
        />
      ),
    },
    {
      title: "3. Confirmation",
      component: (
        <Confirmation
          onClose={handleTransactionComplete}
          onBack={handleBack}
          vendorData={vendorFormData!}
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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
    >
      <DialogContent
        className="w-full max-w-[90%] h-[90vh] p-0 flex flex-col"
        onPointerDownOutside={(e) => {
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
        }}
      >
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

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6">
            {steps[step].component}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
