// @file scripts/e2e-register-auction.ts
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import {
  keccak256,
  toBytes,
  createPublicClient,
  createWalletClient,
  http,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';

import * as schema from '../packages/db/src/schema';
import { relayAbi } from '../packages/shared/relay/abi';
import {
  computeAuctionKey,
  computeParamsHash,
  computeConfirmationCodeHash,
  eip712Domain,
  NOTARY_APPROVAL_TYPES,
  CONSIGNOR_CONFIRM_TYPES,
} from '../packages/shared/relay/sign';
import { submitRegisterAuction } from '../packages/shared/relay/register';

function toAccount(raw: string) {
  const pk = raw.startsWith('0x') ? raw : `0x${raw}`;
  return privateKeyToAccount(pk as `0x${string}`);
}

async function main() {
  const rpcUrl = process.env.ARBITRUM_RPC_URL;
  const contractAddress = process.env.AUCTION_CONTRACT_ADDRESS as `0x${string}` | undefined;
  const relayerRaw = process.env.RELAYER_PRIVATE_KEY;
  const notaryRaw = process.env.NOTARY_PRIVATE_KEY;
  const consignorRaw = process.env.CONSIGNOR_PRIVATE_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (!rpcUrl || !contractAddress || !relayerRaw || !notaryRaw || !consignorRaw || !databaseUrl) {
    throw new Error('ENV tidak lengkap.');
  }

  const relayerAcc = toAccount(relayerRaw);
  const notaryAcc = toAccount(notaryRaw);
  const consignorAcc = toAccount(consignorRaw);

  const publicClient = createPublicClient({ chain: arbitrumSepolia, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account: relayerAcc, chain: arbitrumSepolia, transport: http(rpcUrl) });
  const db = drizzle(neon(databaseUrl), { schema });

  // ── 1. Partner & User ──
  const [notaryPartner] = await db
    .select({ id: schema.partners.id, wallet: schema.users.wallet })
    .from(schema.partners)
    .innerJoin(schema.users, eq(schema.users.id, schema.partners.userId))
    .where(eq(schema.partners.type, 'NOTARY'))
    .limit(1);

  const [guarantorPartner] = await db
    .select({ id: schema.partners.id, wallet: schema.users.wallet })
    .from(schema.partners)
    .innerJoin(schema.users, eq(schema.users.id, schema.partners.userId))
    .where(eq(schema.partners.type, 'GUARANTOR'))
    .limit(1);

  if (!notaryPartner || !guarantorPartner) throw new Error('partner belum di-seed.');

  const consignorWallet = consignorAcc.address.toLowerCase();
  await db.insert(schema.users).values({
    wallet: consignorWallet, userType: 'PUBLIC', preferredLanguage: 'EN',
  }).onConflictDoNothing({ target: schema.users.wallet });

  const [consignorUser] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.wallet, consignorWallet))
    .limit(1);
  if (!consignorUser) throw new Error('gagal insert consignor user');

  // ── 2. Setup Data ──
  const platformBps = 250, guarantorBps = 150, notaryBps = 100, taxBps = 1000;
  const auctionCode = `AUCTION-${Date.now()}`;
  const auctionKey = computeAuctionKey(auctionCode);
  const confirmationCode = `CODE-${Date.now()}`; // Simulasi kode rahasia di email
  const confirmationCodeHash = computeConfirmationCodeHash(confirmationCode);

  const startingBid = 2_000_000n, bidIncrement = 50_000n, durationHours = 12;
  const latest = await publicClient.getBlock({ blockTag: 'latest' });
  const openAt = latest.timestamp + 49n * 3600n;
  const expiry = latest.timestamp + 3600n;
  const paramsHash = computeParamsHash(startingBid, bidIncrement, openAt, durationHours);
  const domain = eip712Domain(arbitrumSepolia.id, contractAddress);

  // ── 3. Insert Auction & Confirmation Code (Simulasi Notary) ──
  const [auctionRow] = await db.insert(schema.auctions).values({
    auctionCode,
    consignorId: consignorUser.id,
    guarantorId: guarantorPartner.id,
    notaryId: notaryPartner.id,
    category: 'OTOMOTIF',
    status: 'PENDING',
    currentRound: 1,
    feeConfigId: null, 
  }).returning({ id: schema.auctions.id });

  await db.insert(schema.auctionRounds).values({
    auctionId: auctionRow.id,
    roundNo: 1,
    startingBid,
    bidIncrement,
    openAt: new Date(Number(openAt) * 1000),
    closeAt: new Date(Number(openAt + BigInt(durationHours) * 3600n) * 1000),
    durationHours,
    scheduledAt: new Date(Number(latest.timestamp) * 1000),
  });

  // Simulasi Notary menyimpan kode ke DB dan mengirim email
  await db.insert(schema.confirmationCodes).values({
    auctionId: auctionRow.id,
    codeHash: Buffer.from(confirmationCodeHash.slice(2), 'hex'), // bytea
    issuedByNotary: notaryPartner.id,
    signature: Buffer.from('dummy_sig'), // Bisa diisi signature EIP712 notary
  });
  console.log(`\n📧 Simulasi Email: Consignor menerima kode "${confirmationCode}"`);

  // ── 4. Signatures (Simulasi Consignor klik Confirm) ──
  const [nonceNotary, nonceConsignor] = await Promise.all([
    publicClient.readContract({ address: contractAddress, abi: relayAbi, functionName: 'nonces', args: [notaryAcc.address] }),
    publicClient.readContract({ address: contractAddress, abi: relayAbi, functionName: 'nonces', args: [consignorAcc.address] }),
  ]);

  const notarySig = await notaryAcc.signTypedData({
    domain, types: NOTARY_APPROVAL_TYPES, primaryType: 'NotaryApproval',
    message: { auctionKey, paramsHash, confirmationCodeHash, nonce: nonceNotary, expiry },
  });

  const consignorSig = await consignorAcc.signTypedData({
    domain, types: CONSIGNOR_CONFIRM_TYPES, primaryType: 'ConsignorConfirm',
    message: { auctionKey, confirmationCodeHash, nonce: nonceConsignor, expiry },
  });

  // ── 5. Panggil Relay ──
  const txHash = await submitRegisterAuction(publicClient, walletClient, contractAddress, {
    auctionKey,
    consignor: consignorAcc.address.toLowerCase() as `0x${string}`,
    guarantor: guarantorPartner.wallet.toLowerCase() as `0x${string}`,
    notary: notaryPartner.wallet.toLowerCase() as `0x${string}`,
    category: 1,
    specHash: keccak256(toBytes(`SPEC-${auctionCode}`)),
    startingBid, bidIncrement, openAt, durationHours,
    platformBps, guarantorBps, notaryBps, taxBps,
    confirmationCodeHash,
    notarySig, consignorSig,
    notaryNonce: nonceNotary, notaryExpiry: expiry,
    consignorNonce: nonceConsignor, consignorExpiry: expiry,
  });

  console.log('\n✅ Registered On-chain:', auctionCode, 'txHash:', txHash);
  console.log('   Menunggu konfirmasi block...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 });
  if (receipt.status !== 'success') throw new Error('registerAuction reverted on-chain');

  // ── 6. Update DB (Web App) ──
  console.log('   Transaksi sukses. Mengupdate DB (Web App task)...');
  
  await db.update(schema.auctions)
    .set({ status: 'SCHEDULED', onchainTxHash: txHash, onchainRegisteredAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.auctions.id, auctionRow.id));

  // Tandai kode sudah dipakai
  await db.update(schema.confirmationCodes)
    .set({ usedAt: new Date() })
    .where(eq(schema.confirmationCodes.auctionId, auctionRow.id));

  console.log('   ✓ Status DB: SCHEDULED.');
  console.log('   ✓ Confirmation Code: USED.');
  process.exit(0);
}

main().catch((e) => { console.error('❌', e?.shortMessage ?? e?.message ?? e); process.exit(1); });