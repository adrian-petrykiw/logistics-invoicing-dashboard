import { z } from "zod";

export const ForexResponseSchema = z.record(
  z.object({
    code: z.string(),
    codein: z.string(),
    name: z.string(),
    high: z.string(),
    low: z.string(),
    varBid: z.string(),
    pctChange: z.string(),
    bid: z.string(),
    ask: z.string(),
    timestamp: z.string(),
    create_date: z.string(),
  })
);

export type ForexResponse = z.infer<typeof ForexResponseSchema>;
