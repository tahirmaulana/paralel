import type {
  Address,
  PublicClient,
} from 'viem';

import { ParalelAuctionAbi } from './abi';
import {
  getParalelContractAddress,
} from './deployment';
import {
  splitContractSignature,
} from './signatures';
import type {
  AwardSignatureInput,
  CollectedInput,
  RegisterAuctionInput,
  ReuseRoundInput,
  WithdrawConsignorInput,
  WithdrawRefundInput,
  WithdrawnInput,
  AuctionTimingConfigState,
  BidConfigState,
  FeeConfigState,
} from './types';

function contractAddressOf(
  client: PublicClient,
): Address {
  const chainId = client.chain?.id;

  if (!chainId) {
    throw new Error(
      'Public client does not define a chain ID',
    );
  }

  return getParalelContractAddress(chainId);
}

export async function simulateRegisterAuction(
  client: PublicClient,
  account: Address,
  input: RegisterAuctionInput,
) {
  return client.simulateContract({
    account,
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'registerAuction',
    args: [
      {
        auctionKey: input.auctionKey,
        consignor: input.consignor,
        guarantor: input.guarantor,
        notary: input.notary,
        category: input.category,
        specHash: input.specHash,
        startingBid: input.startingBid,
        bidIncrement: input.bidIncrement,
        openAt: input.openAt,
        durationHours: input.durationHours,
        confirmationCodeHash:
          input.confirmationCodeHash,
        notarySig: input.notarySig,
        consignorSig: input.consignorSig,
        notaryNonce: input.notaryNonce,
        notaryExpiry: input.notaryExpiry,
        consignorNonce: input.consignorNonce,
        consignorExpiry: input.consignorExpiry,
      },
    ],
  });
}

export async function simulateReuseRound(
  client: PublicClient,
  account: Address,
  input: ReuseRoundInput,
) {
  const { v, r, s } =
    splitContractSignature(input.signature);

  return client.simulateContract({
    account,
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'reuseRound',
    args: [
      input.auctionKey,
      input.startingBid,
      input.bidIncrement,
      input.openAt,
      input.durationHours,
      input.nonce,
      input.expiry,
      v,
      r,
      s,
    ],
  });
}

export async function simulateStartAwarding(
  client: PublicClient,
  account: Address,
  input: {
    auctionKey: `0x${string}`;
    roundNo: number;
  },
) {
  return client.simulateContract({
    account,
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'startAwarding',
    args: [input.auctionKey, input.roundNo],
  });
}

export async function simulateAdvanceCandidate(
  client: PublicClient,
  account: Address,
  input: {
    auctionKey: `0x${string}`;
    roundNo: number;
  },
) {
  return client.simulateContract({
    account,
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'advanceCandidate',
    args: [input.auctionKey, input.roundNo],
  });
}

export async function simulateExpireCollection(
  client: PublicClient,
  account: Address,
  input: {
    auctionKey: `0x${string}`;
    roundNo: number;
  },
) {
  return client.simulateContract({
    account,
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'expireCollection',
    args: [input.auctionKey, input.roundNo],
  });
}

export async function simulateSubmitAwardSignature(
  client: PublicClient,
  account: Address,
  input: AwardSignatureInput,
) {
  const { v, r, s } =
    splitContractSignature(input.signature);

  return client.simulateContract({
    account,
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'submitAwardSignature',
    args: [
      input.auctionKey,
      input.roundNo,
      input.nonce,
      input.expiry,
      v,
      r,
      s,
    ],
  });
}

export async function simulateCollected(
  client: PublicClient,
  account: Address,
  input: CollectedInput,
) {
  const { v, r, s } =
    splitContractSignature(input.signature);

  return client.simulateContract({
    account,
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'collected',
    args: [
      input.auctionKey,
      input.roundNo,
      input.nonce,
      input.expiry,
      v,
      r,
      s,
    ],
  });
}

export async function simulateMarkWithdrawn(
  client: PublicClient,
  account: Address,
  input: WithdrawnInput,
) {
  const { v, r, s } =
    splitContractSignature(input.signature);

  return client.simulateContract({
    account,
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'markWithdrawn',
    args: [
      input.auctionKey,
      input.roundNo,
      input.nonce,
      input.expiry,
      v,
      r,
      s,
    ],
  });
}

export async function simulateWithdrawRefund(
  client: PublicClient,
  account: Address,
  input: WithdrawRefundInput,
) {
  const { v, r, s } =
    splitContractSignature(input.signature);

  return client.simulateContract({
    account,
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'withdrawRefund',
    args: [
      input.auctionKey,
      input.roundNo,
      input.bidder,
      input.nonce,
      input.expiry,
      v,
      r,
      s,
    ],
  });
}

export async function simulateWithdrawConsignor(
  client: PublicClient,
  account: Address,
  input: WithdrawConsignorInput,
) {
  const { v, r, s } =
    splitContractSignature(input.signature);

  return client.simulateContract({
    account,
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'withdrawConsignor',
    args: [
      input.auctionKey,
      input.roundNo,
      input.nonce,
      input.expiry,
      v,
      r,
      s,
    ],
  });
}

export async function simulateWithdrawClaimable(
  client: PublicClient,
  account: Address,
) {
  return client.simulateContract({
    account,
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'withdrawClaimable',
  });
}

export async function simulateSetPartner(
  client: PublicClient,
  account: Address,
  input: {
    wallet: Address;
    partnerType: number;
    category: number;
    active: boolean;
  },
) {
  return client.simulateContract({
    account,
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'setPartner',
    args: [
      input.wallet,
      input.partnerType,
      input.category,
      input.active,
    ],
  });
}

export async function simulateSetRelayer(
  client: PublicClient,
  account: Address,
  newRelayer: Address,
) {
  return client.simulateContract({
    account,
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'setRelayer',
    args: [newRelayer],
  });
}

export async function simulateSetFeeConfig(
  client: PublicClient,
  account: Address,
  config: FeeConfigState,
) {
  return client.simulateContract({
    account,
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'setFeeConfig',
    args: [config],
  });
}

export async function simulateSetTaxWallet(
  client: PublicClient,
  account: Address,
  newTaxWallet: Address,
) {
  return client.simulateContract({
    account,
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'setTaxWallet',
    args: [newTaxWallet],
  });
}

export async function simulateSetAuctionTimingConfig(
  client: PublicClient,
  account: Address,
  config: AuctionTimingConfigState,
) {
  return client.simulateContract({
    account,
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'setAuctionTimingConfig',
    args: [config],
  });
}

export async function simulateSetAllowedIncrement(
  client: PublicClient,
  account: Address,
  increment: bigint,
  allowed: boolean,
) {
  return client.simulateContract({
    account,
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'setAllowedIncrement',
    args: [increment, allowed],
  });
}

export async function simulateSetBidConfig(
  client: PublicClient,
  account: Address,
  config: BidConfigState,
) {
  return client.simulateContract({
    account,
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'setBidConfig',
    args: [config],
  });
}

export async function simulateSetRankingConfig(
  client: PublicClient,
  account: Address,
  maxRankedCandidates: number,
) {
  return client.simulateContract({
    account,
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'setRankingConfig',
    args: [maxRankedCandidates],
  });
}