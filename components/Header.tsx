import { ParticleButton } from "@/components/ParticleButton";
import { cn } from "@/utils/styling";
import Link from "next/link";
import { useRouter } from "next/router";

const navigation = [
  { name: "Overview", href: "/dashboard" },
  { name: "Transactions", href: "/transactions" },
];

export function Header() {
  const router = useRouter();

  return (
    <header className="bg-background border-b border-secondary py-4">
      <div className="container flex justify-between items-center">
        <Link
          href="/dashboard"
          className="text-xl font-bold text-tertiary font-inter"
        >
          CargoBill
        </Link>

        <nav className="flex items-center gap-8">
          {navigation.map((item: any) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "text-sm font-semibold transition-colors hover:text-tertiary",
                router.pathname === item.href
                  ? "text-tertiary"
                  : "text-quaternary/40"
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <ParticleButton />
      </div>
    </header>
  );
}
