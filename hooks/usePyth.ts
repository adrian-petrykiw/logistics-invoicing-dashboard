import { PythService } from "@/services/pyth";
import { FormattedPrice, PYTH_PRICE_FEEDS } from "@/types/pyth";
import { useQuery } from "@tanstack/react-query";

export function usePythPrice(symbol: keyof typeof PYTH_PRICE_FEEDS) {
  return useQuery<FormattedPrice>({
    queryKey: ["pyth-price", symbol],
    queryFn: () => PythService.getLatestPrice(symbol),
  });
}

export function usePythPrices(symbols: Array<keyof typeof PYTH_PRICE_FEEDS>) {
  const priceIds = symbols.map((symbol) => PYTH_PRICE_FEEDS[symbol]);

  return useQuery<FormattedPrice[]>({
    queryKey: ["pyth-prices", symbols],
    queryFn: () => PythService.getLatestPriceUpdates(priceIds),
  });
}
