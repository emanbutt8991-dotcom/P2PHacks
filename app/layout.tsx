import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/components/store";
import { Shell } from "@/components/Shell";

export const metadata: Metadata = {
  title: "CanFirst-AI — Can Canada supply it first?",
  description: "Canadian options first. Global alternatives always. Evidence decides.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <body>
        <StoreProvider>
          <Shell>{children}</Shell>
        </StoreProvider>
      </body>
    </html>
  );
}
