// // // providers/ParticleProvider.tsx
// // import { ConnectKitProvider, createConfig } from "@particle-network/connectkit";
// // import { wallet } from "@particle-network/connectkit/wallet";
// // import { solana, solanaDevnet } from "@particle-network/connectkit/chains";
// // import { authWalletConnectors } from "@particle-network/connectkit/auth";

// const config = createConfig({
//   projectId: process.env.NEXT_PUBLIC_PARTICLE_PROJECT_ID!,
//   clientKey: process.env.NEXT_PUBLIC_PARTICLE_CLIENT_KEY!,
//   appId: process.env.NEXT_PUBLIC_PARTICLE_APP_ID!,
//   appearance: {
//     theme: {
//       "--pcm-font-family": "'__Inter_b0d500', '__Inter_Fallback_b0d500'",
//       "--pcm-body-background": "#ffffff",
//       "--pcm-body-color": "#1A1A1A",
//       "--pcm-primary-button-bankground": "#1A1A1A",
//       "--pcm-primary-button-color": "#ffffff",
//     },
//     splitEmailAndPhone: false,
//     connectorsOrder: ["email", "social"],
//   },
//   walletConnectors: [
//     authWalletConnectors({
//       authTypes: ["google", "email"],
//       fiatCoin: "USD",
//       promptSettingConfig: {
//         promptMasterPasswordSettingWhenLogin: 1,
//         promptPaymentPasswordSettingWhenSign: 1,
//       },
//     }),
//   ],
//   plugins: [
//     wallet({
//       visible: false,
//       customStyle: {
//         fiatCoin: "USD",
//       },
//     }),
//   ],
//   chains: [solana, solanaDevnet],
// });

// export const ParticleProvider = ({ children }: React.PropsWithChildren) => {
//   return <ConnectKitProvider config={config}>{children}</ConnectKitProvider>;
// };
