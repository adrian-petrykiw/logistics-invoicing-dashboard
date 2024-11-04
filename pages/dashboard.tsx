// pages/dashboard.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { FiPlus, FiUsers, FiActivity, FiGrid } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
// import { useSquadsWallet } from "@/features/dashboard/hooks/useSquadsWallet";
import { ParticleButton } from "@/components/layout/ParticleButton";
import { Layout } from "@/components/layout/Layout";
import { CreateTransactionModal } from "@/features/dashboard/components/CreateTransactionModal/index";

export default function DashboardPage() {
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-tertiary">Loading...</div>
      </div>
    );
  }

  return (
    <main className="container mx-auto py-8 ">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-tertiary">Account Info</h1>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-tertiary text-primary hover:bg-quaternary"
        >
          New Transaction <FiPlus />
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-medium text-tertiary">
              Current Balance{" "}
            </h3>
            <div className="text-sm text-quaternary">$0.00 USD</div>
          </div>
          <div className="text-2xl font-bold text-tertiary">
            {/* TODO: Add actual balance */}
            0.00 USDC
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-medium text-tertiary">Team</h3>
            <FiUsers className="text-quaternary" />
          </div>
          {/* <div className="text-2xl font-bold text-tertiary">
          {multisig?.members || None}
          TODO
        </div> */}

          <div className="text-2xl font-bold text-tertiary">NA</div>
        </Card>

        <Card className="p-6">
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
        userWalletAddress={publicKey?.toString() || ""} // Pass wallet address
      />
    </main>
  );
}
