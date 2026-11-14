import {
  computeAuctionKey,
  computeReasonHash,
} from "@paralel/contracts";
import type {
  Hex,
} from "viem";

export const hexToPostgresBytea = (
  value: Hex,
): string =>
  `\\x${value.slice(2).toLowerCase()}`;

export const approvalAttestationPayload = (
  input: Readonly<{
    auctionCode: string;
    specHash: Hex;
    nonce: bigint;
    expiry: bigint;
  }>,
): Readonly<{
  auctionKey: Hex;
  specHash: Hex;
  nonce: string;
  expiry: string;
}> =>
  Object.freeze({
    auctionKey:
      computeAuctionKey(
        input.auctionCode,
      ),
    specHash:
      input.specHash,
    nonce:
      input.nonce.toString(),
    expiry:
      input.expiry.toString(),
  });

export const rejectionAttestationPayload = (
  input: Readonly<{
    auctionCode: string;
    reason: string;
    nonce: bigint;
    expiry: bigint;
  }>,
): Readonly<{
  auctionKey: Hex;
  reasonHash: Hex;
  reason: string;
  nonce: string;
  expiry: string;
}> =>
  Object.freeze({
    auctionKey:
      computeAuctionKey(
        input.auctionCode,
      ),
    reasonHash:
      computeReasonHash(
        input.reason,
      ),
    reason:
      input.reason,
    nonce:
      input.nonce.toString(),
    expiry:
      input.expiry.toString(),
  });
