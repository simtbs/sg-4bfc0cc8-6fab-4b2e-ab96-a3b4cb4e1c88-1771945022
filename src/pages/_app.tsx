import type { AppProps } from "next/app";
import { AuthProvider } from "@/auth/AuthProvider";
import { Toaster } from "@/components/ui/toaster";
import "@/styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
      <Toaster />
    </AuthProvider>
  );
}