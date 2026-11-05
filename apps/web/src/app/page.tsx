// @file apps/web/src/app/page.tsx — Landing Page
import Link from 'next/link';
import { ConnectButton } from '@/components/ConnectButton';

export default function LandingPage() {
  return (
    <main className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center p-8 bg-gray-50 text-gray-900">
      <div className="flex flex-col items-center gap-6 max-w-md w-full">
        
        {/* Logo Placeholder */}
        <div className="w-24 h-24 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-4xl font-black shadow-xl">
          P
        </div>

        {/* Big Text */}
        <h1 className="text-6xl font-extrabold tracking-tighter text-gray-900">
          Paralel
        </h1>
        <p className="text-gray-500 font-medium text-lg text-center -mt-4">
          Web3 RWA Auction Platform
        </p>

        {/* Connect Wallet Button */}
        <div className="mt-8 w-full flex justify-center">
          <ConnectButton variant="landing" />
        </div>

        {/* Link to Auctions */}
        <div className="mt-12">
          <Link
            href="/auctions"
            className="text-sm text-gray-400 hover:text-blue-600 underline transition-colors"
          >
            View public auctions feed →
          </Link>
        </div>

      </div>
    </main>
  );
}