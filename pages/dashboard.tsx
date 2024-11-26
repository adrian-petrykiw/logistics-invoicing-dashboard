import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  FiPlus,
  FiUsers,
  FiActivity,
  FiGrid,
  FiSend,
  FiDownload,
} from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
// import { useSquadsWallet } from "@/features/dashboard/hooks/useSquadsWallet";
import { CurrentBalanceCard } from "@/features/dashboard/components/CurrentBalanceCard";
import { LuArrowDownToLine } from "react-icons/lu";
import {
  SendHorizonal,
  FileText,
  ArrowUpCircle,
  ArrowDownCircle,
  Bell,
  Wallet,
  HandCoins,
  Receipt,
} from "lucide-react";
import dynamic from "next/dynamic";
import { YieldPeriod } from "@/features/dashboard/components/YieldPeriodSelect";

// Dynamic imports for components that use Solana
const CreateTransactionModal = dynamic(
  () =>
    import("@/features/dashboard/components/CreateTransactionModal").then(
      (mod) => mod.CreateTransactionModal
    ),
  { ssr: false }
);
const YieldPeriodSelect = dynamic(
  () =>
    import("@/features/dashboard/components/YieldPeriodSelect").then(
      (mod) => mod.YieldPeriodSelect
    ),
  { ssr: false }
);

export default function DashboardPage() {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [yieldPeriod, setYieldPeriod] = useState<YieldPeriod>("ytd");
  //   const { multisig, isLoading } = useSquadsWallet();

  // Protect dashboard route
  useEffect(() => {
    if (!connected) {
      router.push("/");
    }
  }, [connected, router]);

  //   if (!connected || isLoading) {
  if (!connected) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-tertiary">Loading...</div>
      </div>
    );
  }

  return (
    <main className="container mx-auto py-8 ">
      <div className="flex justify-between items-end mb-4">
        <h1 className="text-lg font-semibold text-tertiary mb-0">
          Account Info
        </h1>
        <div className="flex flex-row gap-2">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-lightgray text-quaternary hover:bg-darkgray shadow-none"
          >
            <LuArrowDownToLine />
            Request Payment
          </Button>{" "}
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-tertiary text-primary hover:bg-quaternary shadow-none"
          >
            <SendHorizonal />
            Send Payment
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <CurrentBalanceCard balance={10.49} />
        <Card className="p-4 items-stretch">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-medium text-tertiary">
              Transactions this Month
            </h3>
            <FiActivity className="text-quaternary" />
          </div>
          <div className="text-2xl font-bold text-tertiary">
            {/* TODO: Add actual count */}0
          </div>
        </Card>
        <Card className="p-4 items-stretch">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-medium text-tertiary">
              Yield Earnings{" "}
            </h3>
            <div className="flex items-center gap-2">
              <YieldPeriodSelect
                value={yieldPeriod}
                onChange={setYieldPeriod}
              />
            </div>{" "}
          </div>
          <div className="text-2xl font-bold text-tertiary">
            {/* TODO: Add actual balance */}
            0.00 USDC
          </div>
        </Card>
        {/* <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-medium text-tertiary">Team</h3>
            <FiUsers className="text-quaternary" />
          </div>
          <div className="text-2xl font-bold text-tertiary">
          {multisig?.members || None}

        </div>

          <div className="text-2xl font-bold text-tertiary">NA</div>
        </Card> */}
      </div>

      <Card className="p-4">
        <h2 className="text-md font-semibold text-tertiary mb-4">
          Recent Activity
        </h2>
        {/* TODO: Add recent activity list */}
        <div className="text-quaternary text-xs">No recent activity</div>
      </Card>

      <CreateTransactionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        userWalletAddress={publicKey?.toString() || ""} // Pass wallet address
      />
    </main>
  );
}
