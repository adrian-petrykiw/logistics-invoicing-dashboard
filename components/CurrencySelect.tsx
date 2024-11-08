// components/CurrencySelect.tsx
import * as React from "react";
import { ChevronDown } from "lucide-react";
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
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="border-0 p-0 h-auto w-auto bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0 [&>span]:p-0 [&>svg]:ml-1 shadow-none text-md">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(allCurrencies)
          .sort(([codeA], [codeB]) => codeA.localeCompare(codeB))
          .map(([code, details]) => (
            <SelectItem key={code} value={code}>
              <div className="flex items-center">
                <span>{code}</span>
              </div>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
