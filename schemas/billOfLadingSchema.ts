import { z } from "zod";

export const billOfLadingSchema = z.object({
  billOfLading: z.string().optional(),
  sender: z.string().min(1, "Sender is required"),
  receiver: z.string().min(1, "Receiver is required"),
  paymentStatus: z.enum(["pending", "completed"]),
  amount: z.number().min(0, "Amount must be positive"),
  paymentMethod: z.enum(["crypto", "ach", "card", "finance"]),
  approvalDate: z.string().min(1, "Approval date is required"),
  processedDate: z.string().min(1, "Processed date is required"),
  direction: z.enum(["inbound", "outbound"]),
  origin: z.string().optional(),
  destination: z.string().optional(),
});

export type BillOfLadingFormValues = z.infer<typeof billOfLadingSchema>;
