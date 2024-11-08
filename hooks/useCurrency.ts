import { useQuery } from "@tanstack/react-query";
import { CurrencyService } from "@/services/currency";
import { SupportedCurrency } from "@/types/currency";

export function useCurrencyConversion(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency
) {
  return useQuery({
    queryKey: ["currency-conversion", amount, from, to],
    queryFn: () => CurrencyService.convertCurrency(amount, from, to),
    staleTime: Infinity,
  });
}
