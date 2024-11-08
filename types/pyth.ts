export const PYTH_PRICE_FEEDS = {
  "USDC/USD":
    "eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  "USDT/USD":
    "2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",

  "EURC/USD":
    "76fa85158bf14ede77087fe3ae472f66213f6ea2f5b411cb2de472794990fa5c",

  // Major Forex Pairs (USD base)
  "EUR/USD": "a995d00bb36a63cef7fd2c287dc105fc8f3d93779f062f09551b0af3e81ec30b",
  "GBP/USD": "84c2dde9633d93d1bcad84e7dc41c9d56578b7ec52fabedc1f335d673df0a7c1",
  "JPY/USD": "ef2c98c804ba503c6a707e38be4dfbb16683775f195b091252bf24693042fd52",
  "AUD/USD": "67a6f93030420c1c9e3fe37c1ab6b77966af82f995944a9fefce357a22854a80",
  "CAD/USD": "3112b03a41c910ed446852aacf67118cb1bec67b2cd0b9a214c58cc0eaa2ecca",

  // Cryptocurrencies
  "BTC/USD": "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  "ETH/USD": "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "SOL/USD": "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
} as const;

export interface FormattedPrice {
  price: number;
  confidence: number;
  timestamp: number;
}

export interface FormattedPrice {
  price: number;
  confidence: number;
  timestamp: number;
}

export const CURRENCY_METADATA = {
  USD: { symbol: "$", name: "US Dollar", decimals: 2 },
  EUR: { symbol: "€", name: "Euro", decimals: 2 },
  GBP: { symbol: "£", name: "British Pound", decimals: 2 },
  JPY: { symbol: "¥", name: "Japanese Yen", decimals: 0 },
  AUD: { symbol: "A$", name: "Australian Dollar", decimals: 2 },
  CAD: { symbol: "C$", name: "Canadian Dollar", decimals: 2 },
  BTC: { symbol: "₿", name: "Bitcoin", decimals: 8 },
  ETH: { symbol: "Ξ", name: "Ethereum", decimals: 6 },
  SOL: { symbol: "◎", name: "Solana", decimals: 4 },
  USDC: { symbol: "$", name: "USD Coin", decimals: 6 },
  USDT: { symbol: "$", name: "Tether", decimals: 6 },
} as const;

export type CurrencyMetadataKey = keyof typeof CURRENCY_METADATA;
