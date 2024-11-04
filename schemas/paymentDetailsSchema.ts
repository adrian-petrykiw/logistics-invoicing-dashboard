import { z } from "zod";

export const paymentMethodSchema = z.enum([
  "credit",
  "ach",
  "wire",
  "credit_card",
  "debit_card",
]);

export const paymentDetailsSchema = z.object({
  paymentMethod: paymentMethodSchema,
  amount: z.number().min(0, "Amount must be greater than 0"),
  // ACH fields
  accountName: z.string().optional(),
  routingNumber: z.string().optional(),
  accountNumber: z.string().optional(),
  accountType: z.enum(["checking", "savings"]).optional(),
  // Wire fields
  bankName: z.string().optional(),
  swiftCode: z.string().optional(),
  // Card fields
  cardNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  cvv: z.string().optional(),
  billingName: z.string().optional(),
  billingAddress: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZip: z.string().optional(),
});

export type PaymentDetailsFormValues = z.infer<typeof paymentDetailsSchema>;

export interface PaymentDetailsFormProps {
  onNext: (data: PaymentDetailsFormValues) => void;
  onBack: () => void;
  vendorFormData: any;
}
