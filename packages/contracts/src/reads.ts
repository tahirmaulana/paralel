import type {
  Address,
  Hex,
  PublicClient,
} from 'viem';

import { ParalelAuctionAbi } from './abi';
import {
  getParalelContractAddress,
} from './deployment';
import type {
  AuctionContractState,
  AuctionConfigSnapshotState,
  AuctionTimingConfigState,
  AuctionKey,
  AuctionRoundState,
  BidderStakeState,
  BidConfigState,
  FeeConfigState,
  PartnerContractState,
  RefundableAmount,
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

export async function readContractOwner(
  client: PublicClient,
): Promise<Address> {
  return client.readContract({
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'owner',
  });
}

export async function readRelayerWallet(
  client: PublicClient,
): Promise<Address> {
  return client.readContract({
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'relayerWallet',
  });
}

export async function readPlatformWallet(
  client: PublicClient,
): Promise<Address> {
  return client.readContract({
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'platformWallet',
  });
}

export async function readTaxWallet(
  client: PublicClient,
): Promise<Address> {
  return client.readContract({
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'taxWallet',
  });
}

export async function readUsdcAddress(
  client: PublicClient,
): Promise<Address> {
  return client.readContract({
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'usdc',
  });
}

export async function readNonce(
  client: PublicClient,
  wallet: Address,
): Promise<bigint> {
  return client.readContract({
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'nonces',
    args: [wallet],
  });
}

export async function readAuctionStatus(
  client: PublicClient,
  auctionKey: AuctionKey,
): Promise<number> {
  const status = await client.readContract({
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'statusOf',
    args: [auctionKey],
  });

  return Number(status);
}

export async function readAuction(
  client: PublicClient,
  auctionKey: AuctionKey,
): Promise<AuctionContractState> {
  const auction = await client.readContract({
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'getAuction',
    args: [auctionKey],
  });

  return {
    consignor: auction.consignor,
    guarantor: auction.guarantor,
    notary: auction.notary,
    category: Number(auction.category),
    status: Number(auction.status),
    currentRound: Number(auction.currentRound),
    specHash: auction.specHash,
    platformBps: Number(auction.platformBps),
    guarantorBps: Number(auction.guarantorBps),
    notaryBps: Number(auction.notaryBps),
    taxBps: Number(auction.taxBps),
  };
}

export async function readAuctionConfigSnapshot(
  client: PublicClient,
  auctionKey: AuctionKey,
): Promise<AuctionConfigSnapshotState> {
  const snapshot = await client.readContract({
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'getAuctionConfigSnapshot',
    args: [auctionKey],
  });

  return {
    taxWallet: snapshot.taxWallet,
    defaultFeeBps: Number(snapshot.defaultFeeBps),
    withdrawalFee: snapshot.withdrawalFee,
    signingWindow: snapshot.signingWindow,
    collectionWindow: snapshot.collectionWindow,
    claimWindow: snapshot.claimWindow,
    maxIncrementBps: Number(snapshot.maxIncrementBps),
    preBidAllowed: snapshot.preBidAllowed,
    maxRankedCandidates: Number(snapshot.maxRankedCandidates),
    minDurationHours: Number(snapshot.minDurationHours),
    maxDurationHours: Number(snapshot.maxDurationHours),
    minOpenDelay: Number(snapshot.minOpenDelay),
    maxOpenDelay: Number(snapshot.maxOpenDelay),
  };
}

export async function readFeeConfig(
  client: PublicClient,
): Promise<FeeConfigState> {
  const address = contractAddressOf(client);
  const feeConfig = await client.readContract({
    address,
    abi: ParalelAuctionAbi,
    functionName: 'feeConfig',
  });
  const defaultCurrency = await client.readContract({
    address,
    abi: ParalelAuctionAbi,
    functionName: 'defaultCurrency',
  });
  const currencyConfig = await client.readContract({
    address,
    abi: ParalelAuctionAbi,
    functionName: 'currencyConfigs',
    args: [defaultCurrency],
  });

  return {
    platformBps: Number(feeConfig.platformBps),
    guarantorBps: Number(feeConfig.guarantorBps),
    notaryBps: Number(feeConfig.notaryBps),
    taxBps: Number(feeConfig.taxBps),
    defaultFeeBps: Number(feeConfig.defaultFeeBps),
    withdrawalFee: currencyConfig[2],
  };
}

export async function readAuctionTimingConfig(
  client: PublicClient,
): Promise<AuctionTimingConfigState> {
  const config = await client.readContract({
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'auctionTimingConfig',
  });

  return {
    signingWindow: Number(config.signingWindow),
    collectionWindow: Number(config.collectionWindow),
    claimWindow: Number(config.claimWindow),
    minDurationHours: Number(config.minDurationHours),
    maxDurationHours: Number(config.maxDurationHours),
    minOpenDelay: Number(config.minOpenDelay),
    maxOpenDelay: Number(config.maxOpenDelay),
  };
}

export async function readBidConfig(
  client: PublicClient,
): Promise<BidConfigState> {
  const config = await client.readContract({
      address: contractAddressOf(client),
      abi: ParalelAuctionAbi,
      functionName: 'bidConfig',
    });

  return {
    maxIncrementBps: Number(config.maxIncrementBps),
    preBidAllowed: config.preBidAllowed,
  };
}

export async function readAuctionRound(
  client: PublicClient,
  auctionKey: AuctionKey,
  roundNo: number,
): Promise<AuctionRoundState> {
  const round = await client.readContract({
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'getRound',
    args: [auctionKey, roundNo],
  });

  return {
    startingBid: round.startingBid,
    bidIncrement: round.bidIncrement,
    openAt: round.openAt,
    closeAt: round.closeAt,
    currentBid: round.currentBid,
    currentLeader: round.currentLeader,
    bidSeq: round.bidSeq,
    topRanks: round.topRanks,
    awardingIndex: Number(round.awardingIndex),
    awardingDeadline: round.awardingDeadline,
    winner: round.winner,
    winnerStake: round.winnerStake,
    collectionDeadline: round.collectionDeadline,
    claimPeriodEnd: round.claimPeriodEnd,
  };
}

export async function readBidderStake(
  client: PublicClient,
  input: {
    auctionKey: AuctionKey;
    roundNo: number;
    bidder: Address;
  },
): Promise<BidderStakeState> {
  const stake = await client.readContract({
      address: contractAddressOf(client),
      abi: ParalelAuctionAbi,
      functionName: 'stakes',
      args: [
        input.auctionKey,
        input.roundNo,
        input.bidder,
      ],
    });

  return {
    myBid: stake.myBid,
    reachedSeq: stake.reachedSeq,
    withdrawn: stake.withdrawn,
  };
}

export async function readRefundableAmount(
  client: PublicClient,
  input: {
    auctionKey: AuctionKey;
    roundNo: number;
    bidder: Address;
  },
): Promise<RefundableAmount> {
  const [gross, fee, net] =
    await client.readContract({
      address: contractAddressOf(client),
      abi: ParalelAuctionAbi,
      functionName: 'refundableOf',
      args: [
        input.auctionKey,
        input.roundNo,
        input.bidder,
      ],
    });

  return { gross, fee, net };
}

export async function readClaimableAmount(
  client: PublicClient,
  wallet: Address,
): Promise<bigint> {
  return client.readContract({
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'claimableOf',
    args: [wallet],
  });
}

export async function readPartnerState(
  client: PublicClient,
  wallet: Address,
): Promise<PartnerContractState> {
  const partner = await client.readContract({
      address: contractAddressOf(client),
      abi: ParalelAuctionAbi,
      functionName: 'partners',
      args: [wallet],
    });

  return {
    pType: Number(partner.pType),
    category: Number(partner.category),
    active: partner.active,
  };
}

export async function readAllowedIncrements(
  client: PublicClient,
): Promise<readonly bigint[]> {
  return client.readContract({
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'getAllowedIncrements',
  });
}

export async function readDomainSeparator(
  client: PublicClient,
): Promise<Hex> {
  return client.readContract({
    address: contractAddressOf(client),
    abi: ParalelAuctionAbi,
    functionName: 'DOMAIN_SEPARATOR',
  });
}