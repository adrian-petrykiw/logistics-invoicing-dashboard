import { ParticleButton } from "@/components/layout/ParticleButton";
import Link from "next/link";
import { useRouter } from "next/router";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Overview", href: "/dashboard" },
  { name: "Transactions", href: "/transactions" },
];

export function Header() {
  const router = useRouter();

  return (
    <header className="bg-primary border-b border-secondary py-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/dashboard" className="text-2xl font-bold text-tertiary">
          INVOICE
        </Link>

        <nav className="flex items-center gap-8">
          {navigation.map((item) => (
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
