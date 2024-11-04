import dynamic from "next/dynamic";

const DynamicParticleButton = dynamic(() => import("./ParticleButtonContent"), {
  ssr: false,
});

export function ParticleButton() {
  return <DynamicParticleButton />;
}
