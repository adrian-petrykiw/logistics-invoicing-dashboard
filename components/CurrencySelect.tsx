import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FIAT_CURRENCIES,
  SUPPORTED_STABLECOINS,
  SupportedCurrency,
} from "@/types/currency";

export function CurrencySelect({
  value,
  onChange,
}: {
  value: SupportedCurrency;
  onChange: (value: SupportedCurrency) => void;
}) {
  const allCurrencies = {
    ...FIAT_CURRENCIES,
    // ...SUPPORTED_STABLECOINS,
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="m-0 p-0 h-auto bg-transparent hover:bg-transparent border-transparent hover:border-transparent ring-transparent border-0 focus:ring-0 focus:ring-offset-0">
        <SelectValue>{value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(allCurrencies)
          .sort(([codeA], [codeB]) => codeA.localeCompare(codeB))
          .map(([code, details]) => (
            <SelectItem key={code} value={code}>
              <div className="flex items-center gap-2">
                <span>{details.symbol}</span>
                <span>{code}</span>
              </div>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
