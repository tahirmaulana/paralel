// @file scripts/e2e-relay-award-withdraw.ts
import 'dotenv/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';

import { getRelayClients, getContractAddress } from '../packages/shared/relay/client';
import { relayAbi } from '../packages/shared/relay/abi';
import { relaySubmitAwardSignature } from '../packages/shared/relay/submit-award';
import { relayWithdrawRefund } from '../packages/shared/relay/withdraw';
import {
  computeAuctionKey,
  eip712Domain,
  AWARD_SIGN_TYPES,
  WITHDRAW_REQUEST_TYPES,
} from '../packages/shared/relay/sign';

const MODE = process.env.MODE as 'award' | 'withdraw';

if (MODE !== 'award' && MODE !== 'withdraw') {
  throw new Error('MODE must be "award" or "withdraw"');
}

const rpcUrl = process.env.ARBITRUM_RPC_URL;
if (!rpcUrl) throw new Error('ARBITRUM_RPC_URL is missing');

const contractAddress = getContractAddress();

const auctionKey: Hex = process.env.AUCTION_KEY
  ? (process.env.AUCTION_KEY as Hex)
  : computeAuctionKey(process.env.AUCTION_CODE!);

const roundNo = Number(process.env.ROUND_NO ?? '1');

const rawBidderPk =
  process.env.BIDDER_PRIVATE_KEY ?? process.env.NOTARY_PRIVATE_KEY;

if (!rawBidderPk) {
  throw new Error('BIDDER_PRIVATE_KEY or NOTARY_PRIVATE_KEY is required');
}

const bidderPk = rawBidderPk.startsWith('0x')
  ? rawBidderPk
  : `0x${rawBidderPk}`;

const bidderAccount = privateKeyToAccount(bidderPk as `0x${string}`);

const { publicClient, walletClient } = getRelayClients();

async function runAward() {
  const round = await publicClient.readContract({
    address: contractAddress,
    abi: relayAbi,
    functionName: 'getRound',
    args: [auctionKey, roundNo],
  });

  const rank = round.awardingIndex;
  const candidate = round.topRanks[rank];

  if (bidderAccount.address.toLowerCase() !== candidate.toLowerCase()) {
    throw new Error(
      `Signer ${bidderAccount.address} is not current candidate ${candidate}`,
    );
  }

  const nonce = await publicClient.readContract({
    address: contractAddress,
    abi: relayAbi,
    functionName: 'nonces',
    args: [candidate],
  });

  const block = await publicClient.getBlock({ blockTag: 'latest' });
  const expiry = block.timestamp + 3600n;

  const signature = await bidderAccount.signTypedData({
    domain: eip712Domain(arbitrumSepolia.id, contractAddress),
    types: AWARD_SIGN_TYPES,
    primaryType: 'AwardSign',
    message: {
      auctionKey,
      roundNo,
      rank,
      nonce,
      expiry,
    },
  });

  console.log({
    mode: 'award',
    auctionKey,
    roundNo,
    rank,
    candidate,
    nonce: nonce.toString(),
    expiry: expiry.toString(),
  });

  const txHash = await relaySubmitAwardSignature(
    publicClient,
    walletClient,
    contractAddress,
    { auctionKey, roundNo, rank, nonce, expiry, signature },
  );

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    timeout: 60_000,
  });

  if (receipt.status !== 'success') {
    throw new Error('submitAwardSignature reverted on-chain');
  }

  console.log('✅ Award signed. txHash:', txHash);
}

async function runWithdraw() {
  const bidder = bidderAccount.address.toLowerCase() as `0x${string}`;

  const nonce = await publicClient.readContract({
    address: contractAddress,
    abi: relayAbi,
    functionName: 'nonces',
    args: [bidder],
  });

  const block = await publicClient.getBlock({ blockTag: 'latest' });
  const expiry = block.timestamp + 3600n;

  const signature = await bidderAccount.signTypedData({
    domain: eip712Domain(arbitrumSepolia.id, contractAddress),
    types: WITHDRAW_REQUEST_TYPES,
    primaryType: 'WithdrawRequest',
    message: {
      auctionKey,
      roundNo,
      wallet: bidder,
      nonce,
      expiry,
    },
  });

  console.log({
    mode: 'withdraw',
    auctionKey,
    roundNo,
    bidder,
    nonce: nonce.toString(),
    expiry: expiry.toString(),
  });

  const txHash = await relayWithdrawRefund(
    publicClient,
    walletClient,
    contractAddress,
    { auctionKey, roundNo, bidder, nonce, expiry, signature },
  );

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    timeout: 60_000,
  });

  if (receipt.status !== 'success') {
    throw new Error('withdrawRefund reverted on-chain');
  }

  console.log('✅ Refund withdrawn. txHash:', txHash);
}

async function main() {
  if (MODE === 'award') {
    await runAward();
  } else {
    await runWithdraw();
  }
}

main().catch((err) => {
  console.error('❌', err?.shortMessage ?? err?.message ?? err);
  process.exit(1);
});