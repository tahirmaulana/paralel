// @file apps/web/src/app/page.tsx — Landing Page
import Link from 'next/link';
import Image from 'next/image';
import { ConnectButton } from '@/components/ConnectButton';

export default function LandingPage() {
  return (
    <main className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center p-8 bg-gray-50 text-gray-900">
      <div className="flex flex-col items-center gap-6 max-w-md w-full">
        
        {/* Logo menggunakan .ico */}
        <Image
          src="/logo.ico"
          alt="Paralel Logo"
          width={100}       // Nilai intrinsik (dummy)
          height={150}      // Nilai intrinsik (dummy)
          className="h-32 w-auto object-contain drop-shadow-md" 
          priority
          unoptimized       // <--- WAJIB untuk file .ico
        />

        {/* Big Text */}
        <h1 className="font-bauhaus text-6xl tracking-normal text-gray-900">
          Paralel
        </h1>
        <p className="text-gray-500 font-medium text-lg text-center -mt-4">
          On-chain Auction Platform for Real-World Assets
        </p>

        {/* Connect Wallet Button */}
        <div className="mt-8 w-full flex justify-center">
          <ConnectButton variant="landing" />
        </div>

        {/* Link to Auctions */}
        <div className="mt-12">
          <Link
            href="/auctions"
            className="text-sm text-gray-400 hover:text-[#5e17eb] underline transition-colors"
          >
            View public auctions feed →
          </Link>
        </div>

      </div>
    </main>
  );
}