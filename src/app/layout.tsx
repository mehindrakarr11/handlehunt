import type { Metadata } from "next";
import "./globals.css";
import { HandleStoreProvider } from "@/lib/client-store";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  title: {
    default: "HandleHunt — Find your rare handle",
    template: "%s | HandleHunt",
  },
  description:
    "Discover and shortlist short, memorable username ideas. Availability must be confirmed manually on Instagram.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <HandleStoreProvider>
          <SiteShell>{children}</SiteShell>
        </HandleStoreProvider>
      </body>
    </html>
  );
}
