import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CurrencySelect } from "@/components/CurrencySelect";
import { useCurrencyConversion } from "@/hooks/useCurrency";
import {
  SupportedCurrency,
  SUPPORTED_STABLECOINS,
  FIAT_CURRENCIES,
} from "@/types/currency";
import { Skeleton } from "@/components/ui/skeleton";

interface CurrentBalanceCardProps {
  balance: number;
  baseCurrency?: SupportedCurrency;
}

export function CurrentBalanceCard({
  balance,
  baseCurrency = "USDC",
}: CurrentBalanceCardProps) {
  const [targetCurrency, setTargetCurrency] =
    useState<SupportedCurrency>("USD");

  const {
    data: conversion,
    isLoading,
    refetch,
    isRefetching,
  } = useCurrencyConversion(balance, baseCurrency, targetCurrency);

  const baseMetadata =
    baseCurrency in SUPPORTED_STABLECOINS
      ? SUPPORTED_STABLECOINS[
          baseCurrency as keyof typeof SUPPORTED_STABLECOINS
        ]
      : FIAT_CURRENCIES[baseCurrency as keyof typeof FIAT_CURRENCIES];

  return (
    <Card className="p-6 h-auto  flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-medium text-tertiary">Current Balance</h3>
        <Button
          variant="ghost"
          size="sm"
          className="p-0 h-6 w-6"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw
            className={cn(
              "h-4 w-4 text-quaternary hover:text-tertiary transition-all",
              isRefetching && "animate-spin"
            )}
          />
          <span className="sr-only">Refresh price</span>
        </Button>
      </div>
      <div className="flex justify-between items-end">
        <div className="text-2xl font-bold text-tertiary">
          {/* {baseMetadata.symbol} */}
          {balance.toFixed(baseMetadata.decimals)} {baseCurrency}
        </div>
        <div className="flex items-center gap-[4px] pb-[2px]">
          <div className="flex items-center gap-2 text-md text-quaternary">
            {isLoading || isRefetching ? (
              <Skeleton className="h-6 w-16" />
            ) : conversion ? (
              <>
                {conversion.symbol}
                {conversion.amount.toFixed(conversion.decimals)}
              </>
            ) : (
              "N/A"
            )}
          </div>
          <CurrencySelect value={targetCurrency} onChange={setTargetCurrency} />
        </div>
      </div>
    </Card>
  );
}
