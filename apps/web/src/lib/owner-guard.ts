// @file apps/web/src/lib/owner-guard.ts
// Server-side check: is `wallet` the on-chain contract owner?
// Used to gate privilege-granting endpoints (e.g. /api/platform-admin/user-admins).
import { createPublicClient, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import abiData from '@/app/abi.json';
import { CONTRACT_ADDRESS } from '@/lib/web3';

export async function verifyOwner(wallet: string): Promise<boolean> {
  try {
    const client = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(process.env.ARBITRUM_RPC_URL),
    });
    const owner = await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: abiData.abi,
      functionName: 'owner',
    });
    return (owner as string).toLowerCase() === wallet.toLowerCase();
  } catch (err: any) {
    console.error('[owner-guard] verify failed:', err?.message ?? err);
    return false;
  }
}