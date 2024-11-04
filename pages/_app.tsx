import { useEffect, useState } from "react";
import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import { ReactQueryProvider } from "@/components/ReactQueryProvider";
import { useRouter } from "next/router";
import { Toaster } from "react-hot-toast";
import { QueryClient } from "@tanstack/react-query";
import "@/styles/globals.css";

// Dynamically import components that use browser APIs
const DynamicWalletProvider = dynamic(
  () =>
    import("@/components/providers/WalletProvider").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => null,
  }
);

const DynamicLayout = dynamic(
  () => import("@/components/Layout").then((mod) => mod.Layout),
  {
    ssr: true,
    loading: () => null,
  }
);

function MyApp({ Component, pageProps }: AppProps) {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
          },
        },
      })
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const isLandingPage = router.pathname === "/";

  return (
    <ReactQueryProvider
      client={queryClient}
      dehydratedState={pageProps.dehydratedState}
    >
      <DynamicWalletProvider>
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
      </DynamicWalletProvider>
    </ReactQueryProvider>
  );
}

export default MyApp;
