// services/pyth.ts
import { FormattedPrice, PYTH_PRICE_FEEDS } from "@/types/pyth";
import axios from "axios";
import toast from "react-hot-toast";

const BASE_URL = "https://hermes.pyth.network";

export class PythService {
  private static async makeRequest(priceIds: string[]) {
    try {
      // Log the request URL for debugging
      const url = `${BASE_URL}/v2/updates/price/latest`;
      console.log("Requesting:", url, "with ids:", priceIds);

      const response = await axios.get(url, {
        params: {
          "ids[]": priceIds,
          parsed: true,
          encoding: "hex",
        },
        headers: {
          Accept: "application/json",
        },
        timeout: 5000,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Axios error:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
      }
      throw error;
    }
  }

  private static formatPriceFromResponse(priceData: any): FormattedPrice {
    try {
      const price = Number(priceData.price) * Math.pow(10, priceData.expo);
      const confidence = Number(priceData.conf) * Math.pow(10, priceData.expo);

      return {
        price,
        confidence,
        timestamp: priceData.publish_time,
      };
    } catch (error) {
      console.error("Error formatting price data:", priceData);
      throw error;
    }
  }

  static async getLatestPriceUpdates(
    priceIds: string[]
  ): Promise<FormattedPrice[]> {
    try {
      const response = await this.makeRequest(priceIds);

      if (!response.parsed || !Array.isArray(response.parsed)) {
        throw new Error("No parsed price data available");
      }

      return response.parsed.map((item: any) =>
        this.formatPriceFromResponse(item.price)
      );
    } catch (error) {
      console.error("Error fetching price updates:", error);
      toast.error("Failed to fetch price updates");
      throw error;
    }
  }

  static async getLatestPrice(
    symbol: keyof typeof PYTH_PRICE_FEEDS
  ): Promise<FormattedPrice> {
    try {
      const priceId = PYTH_PRICE_FEEDS[symbol];
      console.log("Getting price for:", symbol, "with ID:", priceId);

      const updates = await this.getLatestPriceUpdates([priceId]);
      if (!updates || updates.length === 0) {
        throw new Error(`No price data available for ${symbol}`);
      }
      return updates[0];
    } catch (error) {
      console.error(`Error getting price for ${symbol}:`, error);
      throw error;
    }
  }

  // Optional: Method to check if service is accessible
  static async checkService(): Promise<boolean> {
    try {
      const response = await axios.get(`${BASE_URL}/v2/price_feeds`);
      return response.status === 200;
    } catch {
      return false;
    }
  }
}
