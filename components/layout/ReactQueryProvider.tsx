import React, { ReactNode } from "react";
import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

interface ReactQueryProviderProps {
  children: ReactNode;
  client: QueryClient;
  dehydratedState?: unknown;
}

export function ReactQueryProvider({
  children,
  client,
  dehydratedState,
}: ReactQueryProviderProps) {
  // Only use HydrationBoundary if we have dehydrated state
  if (dehydratedState) {
    return (
      <QueryClientProvider client={client}>
        <HydrationBoundary state={dehydratedState}>
          {children}
        </HydrationBoundary>
        <ReactQueryDevtools />
      </QueryClientProvider>
    );
  }

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
