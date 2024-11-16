import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CurrencySelect } from "@/components/CurrencySelect";
import { useCurrencyConversion } from "@/hooks/useCurrency";
import { SupportedCurrency } from "@/types/currency";
import { Skeleton } from "@/components/ui/skeleton";
import { useMultisigVaultBalance } from "@/hooks/squads/useMultisigVaultBalance";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { getMultisigPda } from "@sqds/multisig";
import { DepositModal } from "./DepositModal";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

function BalanceCard() {
  const { publicKey } = useWallet();

  if (!publicKey) {
    console.error("Wallet public key is not available");
    toast.error("Wallet unavailable");

    return {
      balance: <div className="text-2xl font-bold text-muted">N/A</div>,
      multisigPda: null,
      usdcBalance: null,
      isLoading: false,
      refetchBalance: () => Promise.resolve(),
    };
  }

  // Only proceed with getMultisigPda if we have a valid publicKey
  const [multisigPda] = getMultisigPda({
    createKey: publicKey,
  });

  const {
    data: usdcBalance,
    isLoading,
    refetch: refetchBalance,
  } = useMultisigVaultBalance(multisigPda);

  const formatUsdcBalance = (balance: number | null | undefined) => {
    if (balance === null || balance === undefined) return "0.00";
    return balance.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return {
    balance: (
      <>
        {isLoading ? (
          <Skeleton className="h-8 w-32" />
        ) : (
          <div className="text-2xl font-bold">
            {formatUsdcBalance(usdcBalance)} USDC
          </div>
        )}
      </>
    ),
    multisigPda,
    usdcBalance,
    isLoading,
    refetchBalance,
  };
}

export function CurrentBalanceCard() {
  const [targetCurrency, setTargetCurrency] =
    useState<SupportedCurrency>("USD");
  const queryClient = useQueryClient();
  const balanceCard = BalanceCard();

  const {
    data: conversion,
    isLoading: isConversionLoading,
    refetch: refetchConversion,
    isRefetching: isConversionRefetching,
  } = useCurrencyConversion(
    balanceCard.usdcBalance ?? 0,
    "USDC",
    targetCurrency
  );

  const handleRefresh = async () => {
    if (!balanceCard.multisigPda) {
      return; // Early return if no multisigPda available
    }

    // Invalidate and refetch balance using the new object syntax
    await queryClient.invalidateQueries({
      queryKey: ["multisigBalance", balanceCard.multisigPda.toBase58()],
    });

    // Refetch balance
    await balanceCard.refetchBalance();

    // After balance is refreshed, refetch conversion
    await refetchConversion();
  };

  const isLoading = balanceCard.isLoading || isConversionLoading;
  const isRefetching = isConversionRefetching;

  return (
    <Card className="p-4 h-auto flex flex-col justify-between items-stretch">
      <div className="flex items-stretch justify-between">
        <div className="flex items-start gap-2 justify-start">
          <h3 className="text-md font-semibold text-tertiary">
            Current Balance
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-6 w-6"
            onClick={handleRefresh}
            disabled={
              isRefetching || balanceCard.isLoading || !balanceCard.multisigPda
            }
          >
            <RefreshCw
              className={cn(
                "h-4 w-4 text-quaternary hover:text-tertiary transition-all",
                (isRefetching || balanceCard.isLoading) && "animate-spin"
              )}
            />
            <span className="sr-only">Refresh balance</span>
          </Button>
        </div>
        <DepositModal />
      </div>
      <div className="flex justify-between items-end">
        <div className="text-2xl font-bold text-tertiary">
          {balanceCard.balance}
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
