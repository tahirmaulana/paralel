import {
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  toBytes,
  type Hex,
} from 'viem';

const AUCTION_PARAMS = parseAbiParameters(
  'uint128 startingBid, uint128 bidIncrement, uint64 openAt, uint16 durationHours',
);

export function computeAuctionKey(
  auctionCode: string,
): Hex {
  const normalized = auctionCode.trim();

  if (!normalized) {
    throw new Error('auctionCode cannot be empty');
  }

  return keccak256(toBytes(normalized));
}

export function computeConfirmationCodeHash(
  code: string,
): Hex {
  const normalized = code.trim().toUpperCase();

  if (!normalized) {
    throw new Error(
      'confirmation code cannot be empty',
    );
  }

  return keccak256(toBytes(normalized));
}

export function computeAuctionParamsHash(input: {
  startingBid: bigint;
  bidIncrement: bigint;
  openAt: bigint;
  durationHours: number;
}): Hex {
  return keccak256(
    encodeAbiParameters(AUCTION_PARAMS, [
      input.startingBid,
      input.bidIncrement,
      input.openAt,
      input.durationHours,
    ]),
  );
}

export function computeReasonHash(
  reason: string,
): Hex {
  const normalized = reason.trim();

  if (!normalized) {
    throw new Error('reason cannot be empty');
  }

  return keccak256(toBytes(normalized));
}