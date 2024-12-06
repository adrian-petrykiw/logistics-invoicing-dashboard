import { useEffect, useState } from "react";
import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import { ReactQueryProvider } from "@/components/ReactQueryProvider";
import { useRouter } from "next/router";
import { Toaster } from "react-hot-toast";
import { QueryClient } from "@tanstack/react-query";
import "@/styles/globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { useParticleStore } from "@/services/particleAuth";

const DynamicWalletProvider = dynamic(
  () =>
    import("@/components/providers/WalletProvider").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-tertiary">Initializing wallet...</div>
      </div>
    ),
  }
);

const DynamicLayout = dynamic(
  () => import("@/components/Layout").then((mod) => mod.Layout),
  { ssr: true, loading: () => null }
);

function MyApp({ Component, pageProps }: AppProps) {
  const { initialize, particle } = useParticleStore();
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 3,
            retryDelay: 1000,
            refetchOnWindowFocus: true,
            refetchOnMount: true,
          },
        },
      })
  );

  useEffect(() => {
    if (typeof window !== "undefined" && !particle) {
      initialize();
    }
    setIsMounted(true);
  }, [initialize, particle]);

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-tertiary">Initializing application...</div>
      </div>
    );
  }

  const isLandingPage = router.pathname === "/";

  return (
    <ReactQueryProvider
      client={queryClient}
      dehydratedState={pageProps.dehydratedState}
    >
      <DynamicWalletProvider>
        <AuthProvider>
          {isLandingPage ? (
            <Component {...pageProps} />
          ) : (
            <DynamicLayout>
              <Component {...pageProps} />
            </DynamicLayout>
          )}
          <Toaster
            position="top-right"
            toastOptions={{
              className: "bg-tertiary text-primary",
              duration: 4000,
            }}
          />
        </AuthProvider>
      </DynamicWalletProvider>
    </ReactQueryProvider>
  );
}

export default MyApp;
