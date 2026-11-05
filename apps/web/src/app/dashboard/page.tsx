// @file apps/web/src/app/dashboard/page.tsx
import { getNotaryByWallet } from '@/lib/db';
import { NotaryDashboard } from '@/components/NotaryDashboard';
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

  // Cek apakah wallet ini partner NOTARY
  const notary = await getNotaryByWallet(wallet);

  if (notary) {
    return <NotaryDashboard notary={notary} />;
  }

  // Fallback jika wallet user biasa
  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">User Dashboard</h1>
      <p className="text-gray-600">Fitur untuk Bidder / Consignor sedang dikembangkan.</p>
      <Link href="/" className="text-blue-600 hover:underline mt-4 inline-block">
        ← Kembali ke Beranda
      </Link>
    </div>
  );
}