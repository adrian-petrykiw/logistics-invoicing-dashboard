export {};

declare global {
  interface Window {
    particle?: {
      auth: {
        getUserInfo: () => {
          email?: string;
          google_email?: string;
          [key: string]: any;
        } | null;
      };
    };
  }
}
