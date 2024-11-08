import { z } from "zod";

export const transactionSchema = z.object({
  vendor: z.string().min(1, "Vendor is required"),
  billOfLading: z.string().optional(),
  invoices: z.array(
    z.object({
      sender: z.string().min(1, "Sender is required"),
      receiver: z.string().min(1, "Receiver is required"),
      paymentStatus: z.enum(["pending", "completed"]),
      amount: z.number().min(0, "Amount must be positive"),
      paymentMethod: z.enum(["crypto", "ach", "card", "finance"]),
      approvalDate: z.date(),
      processedDate: z.date(),
      direction: z.enum(["inbound", "outbound"]),
      origin: z.string().optional(),
      destination: z.string().optional(),
    })
  ),
  paymentDetails: z.object({
    paymentId: z.string().optional(),
    transactionHash: z.string().optional(),
    amountPaid: z.number().optional(),
  }),
});
