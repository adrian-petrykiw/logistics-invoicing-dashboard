// components/ParticleButton.tsx
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const DynamicParticleButton = dynamic(() => import("./ParticleButtonContent"), {
  ssr: false,
  loading: () => <Skeleton className="h-10 w-[120px]" />,
});

export function ParticleButton() {
  return <DynamicParticleButton />;
}
