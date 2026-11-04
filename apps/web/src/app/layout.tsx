// @file apps/web/src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ConnectButton } from "@/components/ConnectButton";
import Link from "next/link";

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
          {/* Global Header */}
          <header className="border-b bg-white px-8 py-4 flex justify-between items-center sticky top-0 z-10">
            <Link href="/" className="text-xl font-bold tracking-tight">
              Paralel
            </Link>
            <ConnectButton />
          </header>
          
          {/* Main Content */}
          <div className="min-h-[calc(100vh-73px)]">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}