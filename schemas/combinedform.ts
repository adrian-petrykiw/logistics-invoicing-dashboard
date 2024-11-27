import { CustomField } from "@/types/types";
import { VendorListItem } from "@/types/vendor";
import { z } from "zod";

export const invoiceSchema = z.object({
  number: z.string().min(1, "Invoice number is required"),
  amount: z
    .number({
      invalid_type_error: "Invalid amount",
      required_error: "Amount is required",
    })
    .min(0, "Amount must be greater than or equal to 0"),
});

const baseSchema = {
  vendor: z.string().min(1, "Please select a vendor"),
  invoices: z.array(invoiceSchema).min(1, "At least one invoice is required"),
  relatedBolAwb: z.string().optional(),
  paymentDate: z.date(),
  additionalInfo: z.string().optional(),
};

export function createCombinedSchema(customFields: CustomField[] = []) {
  const dynamicFields: Record<string, z.ZodType> = {};

  customFields.forEach((field) => {
    switch (field.type) {
      case "number":
        dynamicFields[field.key] = field.required
          ? z.number()
          : z.number().optional();
        break;
      case "date":
        dynamicFields[field.key] = field.required
          ? z.date()
          : z.date().optional();
        break;
      default:
        dynamicFields[field.key] = field.required
          ? z.string().min(1, `${field.name} is required`)
          : z.string().optional();
    }
  });

  return z.object({
    ...baseSchema,
    ...dynamicFields,
  });
}

export type CombinedFormValues = z.infer<
  ReturnType<typeof createCombinedSchema>
> & {
  [key: string]: any;
};

export interface CombinedVendorFormProps {
  onNext: (data: CombinedFormValues) => void;
  userWalletAddress: string;
  availableVendors: VendorListItem[];
  isVendorsLoading: boolean;
  vendorsError: Error | null;
  refetchVendors: () => void;
}
