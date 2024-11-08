export interface FormattedForexPrice {
  price: number;
  timestamp: number;
  symbol: string;
}

export const FOREX_CURRENCIES = {
  USD: { symbol: "$", name: "US Dollar" },
  BRL: { symbol: "R$", name: "Brazilian Real" },
  EUR: { symbol: "€", name: "Euro" },
  GBP: { symbol: "£", name: "British Pound" },
  JPY: { symbol: "¥", name: "Japanese Yen" },
  INR: { symbol: "₹", name: "Indian Rupee" },
  MXN: { symbol: "$", name: "Mexican Peso" },
  AUD: { symbol: "A$", name: "Australian Dollar" },
  CAD: { symbol: "C$", name: "Canadian Dollar" },
  CNY: { symbol: "¥", name: "Chinese Yuan" },
} as const;

export type CurrencyCode = keyof typeof FOREX_CURRENCIES;
