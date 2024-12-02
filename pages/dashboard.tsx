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
import { YieldPeriod } from "@/features/dashboard/components/YieldPeriodSelect";
import { useAuth } from "@/hooks/useAuth";
import { useAuthContext } from "@/components/providers/AuthProvider";
import dynamic from "next/dynamic";
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
  const [yieldPeriod, setYieldPeriod] = useState<YieldPeriod>("ytd");
  //   const { multisig, isLoading } = useSquadsWallet();
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const { user, isAuthenticated, isLoading } = useAuthContext();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  console.log("Dashboard state:", {
    connected,
    publicKey: publicKey?.toString(),
    user,
    isLoading,
    isAuthenticated,
    wallet: window?.particle?.auth?.getUserInfo(),
  });

  // Modified navigation logic
  useEffect(() => {
    const checkAuth = async () => {
      if (!isLoading && !isAuthenticated) {
        console.log("Redirecting to home - not authenticated");
        router.push("/");
      }
    };
    checkAuth();
  }, [isAuthenticated, isLoading, router]);

  // Show loading while we're checking auth status
  if (isLoading || !connected) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-tertiary">Loading...</div>
      </div>
    );
  }

  // Check auth status
  if (!isAuthenticated || !user?.walletAddress) {
    console.log("Not authenticated, wallet state:", {
      isAuthenticated,
      user,
      connected,
    });
    // Don't redirect here, let the useEffect handle it
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-tertiary">Authenticating...</div>
      </div>
    );
  }
  const { walletAddress, email } = user;

  return (
    <main className="container mx-auto py-8 ">
      <div className="flex justify-between items-end mb-4">
        <h1 className="text-lg font-semibold text-tertiary mb-0">
          Account Info
        </h1>
        <div className="flex flex-row gap-4">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-lightgray text-quaternary hover:bg-darkgray shadow"
          >
            <LuArrowDownToLine />
            Request Payment
          </Button>{" "}
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-tertiary text-primary hover:bg-quaternary shadow"
          >
            <SendHorizonal />
            Send Payment
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <CurrentBalanceCard />
        <Card className="p-4 items-stretch">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-semibold text-tertiary">
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
            <h3 className="text-md font-semibold text-tertiary">
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
        userWalletAddress={walletAddress}
        userEmail={email}
      />
    </main>
  );
}
