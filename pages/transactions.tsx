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
  const { transactions, isLoading } = useTransactions();

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

      <div className="bg-primary rounded-md shadow border border-neutral-200">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Date</TableHead>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Sender</TableHead>
              <TableHead>Receiver</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length ? (
              transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="text-xs">
                    {formatDate(tx.created_at)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <a
                      href={`https://solscan.io/tx/${tx.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-black hover:text-blue-600"
                    >
                      {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                    </a>
                  </TableCell>
                  <TableCell className="capitalize text-xs">
                    {tx.sender.multisig_address == publicKey?.toString()
                      ? "Outbound"
                      : "Inbound"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <a
                      href={`https://solscan.io/tx/${tx.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-black hover:text-blue-600"
                    >
                      {tx.sender.multisig_address.slice(0, 8)}...
                      {tx.sender.multisig_address.slice(-8)}
                    </a>
                  </TableCell>{" "}
                  <TableCell className="font-mono text-xs">
                    <a
                      href={`https://solscan.io/tx/${tx.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-black hover:text-blue-600"
                    >
                      {tx.recipient.multisig_address.slice(0, 8)}...
                      {tx.recipient.multisig_address.slice(-8)}
                    </a>
                  </TableCell>
                  <TableCell className="text-xs">
                    {Number(tx.amount).toFixed(2)}{" "}
                    {tx.token_mint === USDC_MINT.toString() ? "USDC" : "SOL"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs ${getStatusStyle(
                        tx.status
                      )}`}
                    >
                      {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-quaternary">
                  No transactions found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
