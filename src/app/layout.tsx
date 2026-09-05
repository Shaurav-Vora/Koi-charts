import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Koi charts — Your flowchart workspace",
  icons: { icon: "/koi.svg" },
  description: "An accessible workspace for exploring flowcharts through sight, simulated touch, and voice. Application shell preview.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Recorder extensions can add attributes to html before React hydrates.
  // Limit suppression to this element; child hydration checks remain enabled.
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}
