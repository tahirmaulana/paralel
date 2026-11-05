// @file apps/web/src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/Header"; // ← Gunakan Header client component baru

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Paralel Auction",
  description: "Web3 RWA Auction Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <Providers>
          <Header />
          
          <div className="min-h-[calc(100vh-73px)]">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}