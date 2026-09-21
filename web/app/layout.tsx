import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FOUND. — Products you don't search for until you see what they solve.",
  description: "Curated product discovery for Greece: real problems, adaptive funnels, market evidence and current affiliate offers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <body>{children}</body>
    </html>
  );
}
