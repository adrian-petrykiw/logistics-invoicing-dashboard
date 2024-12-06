import React from "react";

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Wallet error caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null; // Or a fallback UI
    }

    return this.props.children;
  }
}
