import { getNotaryByWallet, getGuarantorByWallet } from '@/lib/db';
import { NotaryDashboard } from '@/components/NotaryDashboard';
import { GuarantorDashboard } from '@/components/GuarantorDashboard';
import { UserDashboard } from '@/components/UserDashboard';
import { AdminDashboard } from '@/components/AdminDashboard';
import { WalletGuard } from '@/components/WalletGuard';
import Link from 'next/link';

export const instant = false;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ wallet?: string }>;
}) {
  const { wallet } = await searchParams;

  if (!wallet) return <div className="p-8 text-center text-gray-500">Silakan Connect Wallet.</div>;

  // 1. AUTH GATE: ADMIN (Paling Atas)
  const adminWallets = (process.env.USER_ADMIN_WALLET || '').split(',').map((w) => w.trim().toLowerCase());
  if (adminWallets.includes(wallet.toLowerCase())) {
    return (
      <WalletGuard expectedWallet={wallet}>
        <AdminDashboard adminWallet={wallet} />
      </WalletGuard>
    );
  }

  // 2. AUTH GATE: NOTARY
  const notary = await getNotaryByWallet(wallet);
  if (notary) return <WalletGuard expectedWallet={wallet}><NotaryDashboard notary={notary} /></WalletGuard>;

  // 3. AUTH GATE: GUARANTOR
  const guarantor = await getGuarantorByWallet(wallet);
  if (guarantor) return <WalletGuard expectedWallet={wallet}><GuarantorDashboard guarantor={guarantor} /></WalletGuard>;

  // 4. AUTH GATE: USER
  return (
    <WalletGuard expectedWallet={wallet}>
      <UserDashboard wallet={wallet} />
    </WalletGuard>
  );
}