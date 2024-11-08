import { CURRENCY_METADATA } from "@/types/pyth";

export function formatCurrencyAmount(
  amount: number,
  currency: keyof typeof CURRENCY_METADATA
): string {
  const { symbol, decimals } = CURRENCY_METADATA[currency];
  return `${symbol}${amount.toFixed(decimals)}`;
}

export function formatUSDCAmount(amount: number): string {
  return formatCurrencyAmount(amount, "USDC");
}

export function formatFiatAmount(
  amount: number,
  currency: keyof typeof CURRENCY_METADATA
): string {
  if (currency === "USDC" || currency === "USDT") {
    return formatCurrencyAmount(amount, "USD");
  }
  return formatCurrencyAmount(amount, currency);
}
