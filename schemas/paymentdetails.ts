import { z } from "zod";

// export const paymentMethodSchema = z.enum([
//   "credit",
//   "ach",
//   "wire",
//   "credit_card",
//   "debit_card",
// ]);

export const paymentDetailsSchema = z.discriminatedUnion("paymentMethod", [
  z.object({
    paymentMethod: z.literal("credit"),
  }),
  z.object({
    paymentMethod: z.literal("ach"),
    accountName: z.string().nonempty("Account Name is required"),
    routingNumber: z.string().nonempty("Routing Number is required"),
    accountNumber: z.string().nonempty("Account Number is required"),
    accountType: z.enum(["checking", "savings"]),
  }),
  z.object({
    paymentMethod: z.literal("wire"),
    bankName: z.string().nonempty("Bank Name is required"),
    routingNumber: z.string().nonempty("Routing Number is required"),
    accountNumber: z.string().nonempty("Account Number is required"),
    swiftCode: z.string().optional(),
  }),
  z.object({
    paymentMethod: z.literal("credit_card"),
    cardNumber: z.string().nonempty("Card Number is required"),
    expiryDate: z.string().nonempty("Expiry Date is required"),
    cvv: z.string().nonempty("CVV is required"),
    billingName: z.string().nonempty("Billing Name is required"),
    billingAddress: z.string().nonempty("Billing Address is required"),
    billingCity: z.string().nonempty("Billing City is required"),
    billingState: z.string().nonempty("Billing State is required"),
    billingZip: z.string().nonempty("Billing Zip is required"),
  }),
  z.object({
    paymentMethod: z.literal("debit_card"),
    cardNumber: z.string().nonempty("Card Number is required"),
    expiryDate: z.string().nonempty("Expiry Date is required"),
    cvv: z.string().nonempty("CVV is required"),
    billingName: z.string().nonempty("Billing Name is required"),
    billingAddress: z.string().nonempty("Billing Address is required"),
    billingCity: z.string().nonempty("Billing City is required"),
    billingState: z.string().nonempty("Billing State is required"),
    billingZip: z.string().nonempty("Billing Zip is required"),
  }),
]);

export type PaymentDetailsFormValues = z.infer<typeof paymentDetailsSchema>;
import { CombinedFormValues } from "@/schemas/combinedform";

export interface PaymentDetailsFormProps {
  onNext: (
    data: PaymentDetailsFormValues,
    vendorData: CombinedFormValues
  ) => void;
  onBack: () => void;
  vendorFormData: CombinedFormValues;
  userWalletAddress: string;
}
