import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "TactiFlow — Your flowchart workspace",
  description: "An accessible workspace for exploring flowcharts through sight, simulated touch, and voice. Application shell preview.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
