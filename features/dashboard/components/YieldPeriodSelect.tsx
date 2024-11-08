import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type YieldPeriod = "ytd" | "1m" | "3m" | "6m" | "1y" | "all";

interface YieldPeriodSelectProps {
  value: YieldPeriod;
  onChange: (value: YieldPeriod) => void;
}

const YIELD_PERIODS: Record<YieldPeriod, { short: string; full: string }> = {
  ytd: { short: "YTD", full: "Year to Date (YTD)" },
  "1m": { short: "1M", full: "1 Month (1M)" },
  "3m": { short: "3M", full: "3 Months (3M)" },
  "6m": { short: "6M", full: "6 Months (6M)" },
  "1y": { short: "1Y", full: "1 Year (1Y)" },
  all: { short: "ALL", full: "All Time (ALL)" },
};

export function YieldPeriodSelect({ value, onChange }: YieldPeriodSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="border-0 p-0 h-auto w-auto bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0 [&>span]:p-0 [&>svg]:ml-1 shadow-none text-md">
        <SelectValue>{YIELD_PERIODS[value].short}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end" alignOffset={0} className="min-w-[140px]">
        {Object.entries(YIELD_PERIODS).map(([code, { short, full }]) => (
          <SelectItem key={code} value={code}>
            <div className="flex items-center">
              <span>{full}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
