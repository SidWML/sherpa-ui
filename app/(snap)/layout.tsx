import type { Metadata } from "next";
import { fontVars } from "../fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "Snap & Lead",
  description: "Proof of concept: spot a lift, chat with AI, and create the right lead.",
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function SnapLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fontVars} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
