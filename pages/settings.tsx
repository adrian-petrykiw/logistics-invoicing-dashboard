import { useEffect } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const router = useRouter();
  const { connected, wallet } = useWallet();

  // Protect route
  useEffect(() => {
    if (!connected) {
      router.push("/");
    }
  }, [connected, router]);

  const userEmail =
    connected && wallet?.adapter.name === "Particle"
      ? window.particle?.auth.userInfo()?.email ?? "Not Available"
      : null;

  if (!connected) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-tertiary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      <header className="bg-primary border-b border-secondary px-6 py-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold text-tertiary">Settings</h1>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={userEmail ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input placeholder="Enter your display name" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Add notification settings here */}
                <p className="text-quaternary">
                  Notification settings coming soon...
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Add security settings here */}
                <p className="text-quaternary">
                  Security settings coming soon...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
