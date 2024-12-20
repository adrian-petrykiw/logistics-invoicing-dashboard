import React from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export type ProcessingStep =
  | "awaiting_funds"
  | "encrypting"
  | "creating"
  | "confirming"
  | "confirmed";

interface ProcessingStatusProps {
  currentStep: ProcessingStep;
  isOnRamp?: boolean;
  onDone?: () => void;
}

const stepConfig: Record<ProcessingStep, string> = {
  awaiting_funds: "Awaiting Registration Funds",
  encrypting: "Encrypting Payment Data",
  creating: "Creating Transaction",
  confirming: "Confirming Transaction",
  confirmed: "Payment Confirmed",
};

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  currentStep,
  isOnRamp = false,
  onDone,
}) => {
  const steps: ProcessingStep[] = isOnRamp
    ? ["awaiting_funds", "encrypting", "creating", "confirming", "confirmed"]
    : ["encrypting", "creating", "confirming", "confirmed"];

  const currentStepIndex = steps.indexOf(currentStep);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        {currentStep === "awaiting_funds" && (
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          </div>
        )}
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <Card key={step} className="p-4">
            <div className="flex items-center justify-between">
              <p
                className={`text-sm font-medium ${
                  index === currentStepIndex
                    ? "text-primary"
                    : index < currentStepIndex
                    ? "text-gray-500"
                    : "text-gray-400"
                }`}
              >
                {stepConfig[step]}
              </p>
              <Loader2
                className={`h-5 w-5 ${
                  index === currentStepIndex
                    ? "text-primary animate-spin"
                    : index < currentStepIndex
                    ? "text-green-500"
                    : "hidden"
                }`}
              />
            </div>
          </Card>
        ))}
      </div>

      {currentStep === "confirmed" && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Check className="h-5 w-5 text-green-500" />
              <span className="text-green-700 font-medium">
                Payment Successfully Completed!
              </span>
            </div>
            {onDone && (
              <Button
                onClick={onDone}
                variant="outline"
                className="px-4 py-2 text-green-600 border-green-200 hover:bg-green-100"
              >
                View Transaction
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ProcessingStatus;
