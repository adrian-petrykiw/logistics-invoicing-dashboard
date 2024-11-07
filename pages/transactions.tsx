import { useEffect } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { FiSearch } from "react-icons/fi";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTransactions } from "@/features/transactions/hooks/useTransactions";
import { Layout } from "@/components/Layout";

export default function TransactionsPage() {
  const router = useRouter();
  const { connected } = useWallet();
  // const { transactions, isLoading } = useTransactions();

  // useEffect(() => {
  //   const checkAuth = async () => {
  //     if (!connected) {
  //       console.log("Not connected, redirecting to home");
  //       await router.push("/");
  //     }
  //   };

  //   checkAuth();
  // }, [connected, router]);

  // if (!connected || isLoading) {
  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen bg-secondary flex items-center justify-center">
  //       <div className="text-tertiary">Loading...</div>
  //     </div>
  //   );
  // }

  return (
    <main className="container mx-auto py-8">
      {/* Search and Filters */}

      <div className="flex justify-between items-end mb-4">
        <h1 className="text-lg font-bold text-tertiary">Transaction History</h1>
        <div className="mb-2">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-quaternary" />
            <Input className="pl-10" placeholder="Search transactions..." />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
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
            {/* {transactions?.length ? (
                transactions.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell>{tx.date}</TableCell>
                    <TableCell className="font-mono">{tx.id}</TableCell>
                    <TableCell>{tx.amount} SOL</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          tx.status === "completed"
                            ? "bg-success/10 text-success"
                            : tx.status === "pending"
                            ? "bg-warning/10 text-warning"
                            : "bg-error/10 text-error"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </TableCell>
                    <TableCell>{tx.type}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-quaternary"
                  >
                    No transactions found
                  </TableCell>
                </TableRow>
              )} */}
            <TableRow>
              <TableCell colSpan={5} className="text-center text-quaternary">
                No transactions found
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
