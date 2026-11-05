// @file apps/web/src/app/dashboard/page.tsx
import { getNotaryByWallet, getGuarantorByWallet } from '@/lib/db';
import { NotaryDashboard } from '@/components/NotaryDashboard';
import { GuarantorDashboard } from '@/components/GuarantorDashboard';
import { WalletGuard } from '@/components/WalletGuard';
import Link from 'next/link';

export const instant = false;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ wallet?: string }>;
}) {
  const { wallet } = await searchParams;

  if (!wallet) {
    return (
      <div className="p-8 text-center text-gray-500">
        Silakan Connect Wallet terlebih dahulu di pojok kanan atas.
      </div>
    );
  }

  // Auth gate: notary first
  const notary = await getNotaryByWallet(wallet);
  if (notary) {
    return (
      <WalletGuard expectedWallet={wallet}>
        <NotaryDashboard notary={notary} />
      </WalletGuard>
    );
  }

  // Auth gate: guarantor
  const guarantor = await getGuarantorByWallet(wallet);
  if (guarantor) {
    return (
      <WalletGuard expectedWallet={wallet}>
        <GuarantorDashboard guarantor={guarantor} />
      </WalletGuard>
    );
  }

  // Fallback untuk wallet user biasa
  return (
    <WalletGuard expectedWallet={wallet}>
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">User Dashboard</h1>
        <p className="text-gray-600">
          Fitur untuk Bidder / Consignor sedang dikembangkan.
        </p>
        <Link href="/auctions" className="text-blue-600 hover:underline mt-4 inline-block">
          ← Kembali ke Feed
        </Link>
      </div>
    </WalletGuard>
  );
}