import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ΑΞΙΖΕΙ; — Πριν αγοράσεις, απόδειξέ το.",
  description: "Evidence-first purchase decisions για την Ελλάδα: κόστος προβλήματος, αγορά, προϊόν, οικονομικά και evidence gaps πριν την αγορά.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <body>{children}</body>
    </html>
  );
}
