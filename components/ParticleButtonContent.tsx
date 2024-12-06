import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { WalletName } from "@solana/wallet-adapter-base";
import { useRouter } from "next/router";
import { useEffect, useCallback, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, Settings, LogOut, Store } from "lucide-react";
import toast from "react-hot-toast";

const ParticleButtonContent = () => {
  const { select, connecting, connected, wallet, disconnect } = useWallet();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleParticleConnect = useCallback(async () => {
    if (!connected && !connecting) {
      try {
        // Add initialization check
        if (!window.particle?.auth) {
          console.error("Particle auth not initialized");
          return;
        }

        await disconnect();
        await new Promise((resolve) => setTimeout(resolve, 500)); // Increase delay
        await select("Particle" as WalletName);
      } catch (error) {
        console.error("Connection error:", error);
        toast.error("Connection error!");
      }
    }
  }, [connected, connecting, select, disconnect]);

  useEffect(() => {
    if (connected && wallet?.adapter.name === "Particle") {
      try {
        // Safely access particle user info
        const particleAuth = window?.particle?.auth;
        const userInfo = particleAuth?.getUserInfo();
        const email = userInfo?.email || userInfo?.google_email;

        setUserEmail(email || "Connected");

        // Only navigate if we're not already on dashboard
        if (router.pathname === "/") {
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Error getting user info:", error);
        setUserEmail("Connected");
      }
    } else {
      setUserEmail(null);
    }
  }, [connected, wallet?.adapter.name, router]);

  const handleRegister = useCallback(() => {
    setIsOpen(false);
    router.push("/settings");
  }, [router]);

  const handleSettings = useCallback(() => {
    setIsOpen(false);
    router.push("/settings");
  }, [router]);

  const handleLogout = useCallback(async () => {
    try {
      setIsOpen(false);
      await disconnect();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [disconnect, router]);

  if (connected && wallet?.adapter.name === "Particle") {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <span className="truncate max-w-[200px]">{userEmail}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-48 p-2"
          align="end"
          side="bottom"
          sideOffset={4}
        >
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              className="flex items-center gap-2 justify-start"
              onClick={handleSettings}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Button>
            <Button
              variant="ghost"
              className="flex items-center gap-2 justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Button
      onClick={handleParticleConnect}
      disabled={connecting}
      className="bg-tertiary hover:bg-quaternary text-primary"
    >
      {connecting ? "Connecting..." : "Login/Signup"}
    </Button>
  );
};

export default ParticleButtonContent;
