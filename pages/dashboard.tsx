import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { FiPlus, FiUsers, FiActivity, FiGrid } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
// import { useSquadsWallet } from "@/features/dashboard/hooks/useSquadsWallet";
import { CreateTransactionModal } from "@/features/dashboard/components/CreateTransactionModal/index";
import { CurrentBalanceCard } from "@/features/dashboard/components/CurrentBalanceCard";
import {
  YieldPeriod,
  YieldPeriodSelect,
} from "@/features/dashboard/components/YieldPeriodSelect";
import { useAuth } from "@/hooks/useAuth";
import { useAuthContext } from "@/components/providers/AuthProvider";

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
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-tertiary text-primary hover:bg-quaternary"
        >
          <FiPlus />
          New Transaction
        </Button>
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

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-tertiary mb-4">
          Recent Activity
        </h2>
        {/* TODO: Add recent activity list */}
        <div className="text-quaternary">No recent activity</div>
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
