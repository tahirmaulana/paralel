import { UserAdminDashboard } from '@/components/UserAdminDashboard';
import { WalletGuard } from '@/components/WalletGuard';
import { isUserAdmin } from '@/lib/db';
import Link from 'next/link';

export const instant = false;

export default async function UserAdminPage({
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

  if (!(await isUserAdmin(wallet))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full border">
          <h1 className="text-6xl font-black text-gray-200 mb-4">404</h1>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            Wallet Anda tidak terdaftar sebagai User Admin (KYC).
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
      <UserAdminDashboard adminWallet={wallet} />
    </WalletGuard>
  );
}