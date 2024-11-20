// pages/transactions.tsx
import { useEffect } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { FiSearch } from "react-icons/fi";
import { RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTransactions } from "@/features/transactions/hooks/useTransactions";
import { useAuthContext } from "@/components/providers/AuthProvider";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function TransactionsPage() {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const { transactions, isLoading, error, refetch, isRefetching } =
    useTransactions();

  useEffect(() => {
    const checkAuth = async () => {
      if (!authLoading && !isAuthenticated) {
        console.log("Redirecting to home - not authenticated");
        router.push("/");
      }
    };
    checkAuth();
  }, [isAuthenticated, authLoading, router]);

  if (authLoading || !connected) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-tertiary">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user?.walletAddress) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-tertiary">Authenticating...</div>
      </div>
    );
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-50 text-green-700";
      case "pending":
        return "bg-yellow-50 text-yellow-700";
      case "failed":
        return "bg-red-50 text-red-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  return (
    <main className="container mx-auto py-8">
      <div className="flex justify-between items-end mb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-tertiary">
            Transaction History
          </h1>
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-6 w-6"
            onClick={() => refetch()}
            disabled={isRefetching || isLoading}
          >
            <RefreshCw
              className={cn(
                "h-4 w-4 text-quaternary hover:text-tertiary transition-all",
                (isRefetching || isLoading) && "animate-spin"
              )}
            />
            <span className="sr-only">Refresh transactions</span>
          </Button>
        </div>
        <div className="mb-2">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-quaternary" />
            <Input className="pl-10" placeholder="Search transactions..." />
          </div>
        </div>
      </div>

      <div className="bg-primary rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Date</TableHead>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions?.length ? (
              transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{formatDate(tx.created_at)}</TableCell>
                  <TableCell className="font-mono">
                    <a
                      href={`https://solscan.io/tx/${tx.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                    </a>
                  </TableCell>
                  <TableCell>
                    {tx.amount.toLocaleString()}{" "}
                    {tx.token_mint === process.env.NEXT_PUBLIC_USDC_MINT
                      ? "USDC"
                      : "SOL"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-sm ${getStatusStyle(
                        tx.status
                      )}`}
                    >
                      {tx.status}
                    </span>
                  </TableCell>
                  <TableCell className="capitalize">
                    {tx.transaction_type}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-quaternary">
                  {isLoading
                    ? "Loading transactions..."
                    : "No transactions found"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
