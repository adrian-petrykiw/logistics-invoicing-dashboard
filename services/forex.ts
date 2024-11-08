import { ForexResponseSchema } from "@/schemas/forex";
import {
  CurrencyCode,
  FOREX_CURRENCIES,
  FormattedForexPrice,
} from "@/types/forex";

export class ForexService {
  private static BASE_URL = "https://economia.awesomeapi.com.br/json/last";

  static async getExchangeRate(
    from: CurrencyCode,
    to: CurrencyCode
  ): Promise<FormattedForexPrice> {
    try {
      const response = await fetch(`${this.BASE_URL}/${from}-${to}`);

      if (!response.ok) {
        throw new Error("Failed to fetch exchange rate");
      }

      const data = await response.json();
      const parsed = ForexResponseSchema.parse(data);
      const pair = parsed[`${from}${to}`];

      return {
        price: Number(pair.bid),
        timestamp: Number(pair.timestamp),
        symbol: FOREX_CURRENCIES[to].symbol,
      };
    } catch (error) {
      console.error("Error fetching forex rate:", error);
      throw error;
    }
  }

  static getCurrencySymbol(code: CurrencyCode): string {
    return FOREX_CURRENCIES[code].symbol;
  }
}
