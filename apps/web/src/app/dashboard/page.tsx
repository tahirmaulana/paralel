import { getNotaryByWallet, getGuarantorByWallet, isUserAdmin } from '@/lib/db';
import { NotaryDashboard } from '@/components/NotaryDashboard';
import { GuarantorDashboard } from '@/components/GuarantorDashboard';
import { UserDashboard } from '@/components/UserDashboard';
import { UserAdminDashboard } from '@/components/UserAdminDashboard';
import { WalletGuard } from '@/components/WalletGuard';
import { redirect } from 'next/navigation';
import { createPublicClient, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import abiData from '@/app/abi.json';
import { CONTRACT_ADDRESS } from '@/lib/web3';

export const instant = false;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ wallet?: string }>;
}) {
  const { wallet } = await searchParams;

  if (!wallet) return <div className="p-8 text-center text-gray-500">Silakan Connect Wallet.</div>;

  // ─── 1. SMART ROUTING: CEK APAKAH DIA OWNER KONTRAK ───
  let isContractOwner = false;
  try {
    const client = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL),
    });

    const owner = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: abiData.abi,
      functionName: 'owner',
    });

    if (owner && (owner as string).toLowerCase() === wallet.toLowerCase()) {
      isContractOwner = true;
    }
  } catch (error) {
    console.error("Gagal mengecek Owner Kontrak:", error);
  }

  if (isContractOwner) {
    redirect('/platform-admin');
  }

  // ─── 2. AUTH GATE: USER ADMIN (KYC) — env + DB ───
  if (await isUserAdmin(wallet)) {
    return (
      <WalletGuard expectedWallet={wallet}>
        <UserAdminDashboard adminWallet={wallet} />
      </WalletGuard>
    );
  }

  // ─── 3. AUTH GATE: NOTARY ───
  const notary = await getNotaryByWallet(wallet);
  if (notary) return <WalletGuard expectedWallet={wallet}><NotaryDashboard notary={notary} /></WalletGuard>;

  // ─── 4. AUTH GATE: GUARANTOR ───
  const guarantor = await getGuarantorByWallet(wallet);
  if (guarantor) return <WalletGuard expectedWallet={wallet}><GuarantorDashboard guarantor={guarantor} /></WalletGuard>;

  // ─── 5. FALLBACK: USER BIASA ───
  return (
    <WalletGuard expectedWallet={wallet}>
      <UserDashboard wallet={wallet} />
    </WalletGuard>
  );
}