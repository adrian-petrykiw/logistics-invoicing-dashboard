import { useState } from "react";
import { useRouter } from "next/router";
import { FiLock, FiDollarSign, FiZap } from "react-icons/fi";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";

export const WalletButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export const ParticleAuthButton = dynamic(
  async () =>
    import("@/components/ParticleButton").then((mod) => mod.ParticleButton),
  { ssr: false }
);

export default function LandingPage() {
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const { connected } = useWallet();
  const router = useRouter();

  const handleGetStarted = () => {
    if (connected) {
      setIsSignupOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-primary">
      {/* Navigation */}
      <nav className="border-b border-secondary px-6 py-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-tertiary font-montserrat">
            CARGOBILL
          </h1>
          <div className="flex items-center gap-4">
            <ParticleAuthButton />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-tertiary mb-6">
            Logistics Payments Made Better
          </h1>
          <p className="text-lg text-quaternary mb-8">
            Send & receive invoice payments in minutes for less than a penny
            anywhere in the world
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <FeatureCard
            icon={<FiZap className="w-8 h-8" />}
            title="Fast"
            description="Process international payments in minutes"
          />
          <FeatureCard
            icon={<FiDollarSign className="w-8 h-8" />}
            title="Low Fee"
            description="Simple $5 fee on payments over $1000"
          />
          <FeatureCard
            icon={<FiLock className="w-8 h-8" />}
            title="Secure"
            description="Manage your team's permissions, set spending limits, and batch invoices"
          />
        </div>
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-lg border border-secondary bg-primary">
      <div className="text-tertiary mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-tertiary mb-2">{title}</h3>
      <p className="text-quaternary">{description}</p>
    </div>
  );
}
