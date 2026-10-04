import type { Metadata } from "next";
import "@fontsource-variable/public-sans";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Sign in | Waypoint", template: "%s | Waypoint" },
  description:
    "Waypoint delivery planning. One connected workflow for dispatch, loading, delivery, and receipt.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
