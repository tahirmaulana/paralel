import { AdminDashboard } from '@/components/AdminDashboard';
import { WalletGuard } from '@/components/WalletGuard';
import Link from 'next/link';

export const instant = false;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ wallet?: string }>;
}) {
  const { wallet } = await searchParams;

  if (!wallet) {
    return (
      <div className="p-8 text-center text-gray-500">
        Silakan Connect Wallet.
      </div>
    );
  }

  const adminWallets = (process.env.USER_ADMIN_WALLET || '')
    .split(',')
    .map((w) => w.trim().toLowerCase());

  if (!adminWallets.includes(wallet.toLowerCase())) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full border">
          <h1 className="text-6xl font-black text-gray-200 mb-4">404</h1>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Admin Access Denied</h2>
          <p className="text-gray-600 mb-6">
            Wallet Anda tidak terdaftar sebagai Admin.
          </p>
          <Link href="/" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">
            Back to Landing Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <WalletGuard expectedWallet={wallet}>
      <AdminDashboard adminWallet={wallet} />
    </WalletGuard>
  );
}