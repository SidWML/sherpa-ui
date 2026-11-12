import type { Metadata } from "next";
import { fontVars } from "../fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "SHERPA",
  description: "Proof of concept: one AI front door for every Schindler seller.",
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function SherpaLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontVars} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
