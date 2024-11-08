import {
  SUPPORTED_STABLECOINS,
  FIAT_CURRENCIES,
  StableCoin,
  FiatCurrency,
  SupportedCurrency,
} from "@/types/currency";
import { PythService } from "./pyth";
import { ForexService } from "./forex";
import { PYTH_PRICE_FEEDS } from "@/types/pyth";

interface ConversionResult {
  amount: number;
  symbol: string;
  decimals: number;
}

export class CurrencyService {
  private static async getUsdPrice(currency: StableCoin): Promise<number> {
    console.log("Running getUsdPrice for currency: ", currency);
    const pair = `${currency}/USD` as keyof typeof PYTH_PRICE_FEEDS;
    const price = await PythService.getLatestPrice(pair);
    return price.price;
  }

  private static async getFiatRate(
    targetCurrency: FiatCurrency
  ): Promise<number> {
    if (targetCurrency === "USD") return 1;

    const pythPair = `${targetCurrency}/USD` as keyof typeof PYTH_PRICE_FEEDS;
    if (pythPair in PYTH_PRICE_FEEDS) {
      const pythRate = await PythService.getLatestPrice(pythPair);
      return 1 / pythRate.price; // Invert because we want USD/TARGET
    }

    // Fallback to Forex API
    const forexRate = await ForexService.getExchangeRate("USD", targetCurrency);
    return forexRate.price;
  }

  static async convertCurrency(
    amount: number,
    from: SupportedCurrency,
    to: SupportedCurrency
  ): Promise<ConversionResult> {
    try {
      let usdAmount: number;

      // First convert to USD if needed
      if (from in SUPPORTED_STABLECOINS) {
        // From stablecoin to USD
        const usdPrice = await this.getUsdPrice(from as StableCoin);
        usdAmount = amount * usdPrice;
      } else if (from === "USD") {
        // Already in USD
        usdAmount = amount;
      } else {
        // From other fiat to USD
        const fiatRate = await this.getFiatRate(from as FiatCurrency);
        usdAmount = amount / fiatRate;
      }

      // Then convert USD to target currency
      let finalAmount: number;
      if (to in SUPPORTED_STABLECOINS) {
        // To stablecoin from USD
        const usdPrice = await this.getUsdPrice(to as StableCoin);
        finalAmount = usdAmount / usdPrice;
      } else if (to === "USD") {
        // Keep as USD
        finalAmount = usdAmount;
      } else {
        // To other fiat from USD
        const fiatRate = await this.getFiatRate(to as FiatCurrency);
        finalAmount = usdAmount * fiatRate;
      }

      const metadata =
        to in SUPPORTED_STABLECOINS
          ? SUPPORTED_STABLECOINS[to as StableCoin]
          : FIAT_CURRENCIES[to as FiatCurrency];

      return {
        amount: finalAmount,
        symbol: metadata.symbol,
        decimals: metadata.decimals,
      };
    } catch (error) {
      console.error(`Error converting ${from} to ${to}:`, error);
      throw error;
    }
  }
}
