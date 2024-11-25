import dynamic from "next/dynamic";

const DynamicCurrentBalanceContent = dynamic(
  () => import("./CurrentBalanceContent"),
  { ssr: false }
);

export const CurrentBalanceCard = () => <DynamicCurrentBalanceContent />;
