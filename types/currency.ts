export const SUPPORTED_STABLECOINS = {
  USDC: { symbol: "$", name: "USD Coin", decimals: 2 },
  USDT: { symbol: "$", name: "Tether", decimals: 2 },
  EURC: { symbol: "€", name: "Euro Coin", decimals: 2 },
} as const;

export const FIAT_CURRENCIES = {
  USD: { symbol: "$", name: "US Dollar", decimals: 2 },
  EUR: { symbol: "€", name: "Euro", decimals: 2 },
  GBP: { symbol: "£", name: "British Pound", decimals: 2 },
  JPY: { symbol: "¥", name: "Japanese Yen", decimals: 0 },
  AUD: { symbol: "A$", name: "Australian Dollar", decimals: 2 },
  CAD: { symbol: "C$", name: "Canadian Dollar", decimals: 2 },
} as const;

export type StableCoin = keyof typeof SUPPORTED_STABLECOINS;
export type FiatCurrency = keyof typeof FIAT_CURRENCIES;
export type SupportedCurrency = StableCoin | FiatCurrency;
