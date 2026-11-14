// @file packages/shared/relay/confirm-code.ts
// Formula derivation ConfirmationCode versi v1_ccc_xxx_vvv.
// Ref: docs/PARALEL.md Lampiran D11.3
//
//   ccc = keccak256(abi.encode("AUCTION_CREATED", auctionCode, floor(auctions.created_at / 1000)))
//   xxx = keccak256(abi.encode("GUARANTOR_APPROVED", auctionId, guarantorWallet, floor(attestations.created_at / 1000)))
//   vvv = keccak256(abi.encode("NOTARY_APPROVAL", notaryWallet, nonce, expiry))
//   assembled = keccak256(abi.encode(ccc, xxx, vvv))
//   code = base36(assembled).toUpperCase().padStart(8, '0').slice(0, 8)
//   codeHash = keccak256(toBytes(code))
//
// Kode plaintext TIDAK pernah dikirim ke frontend. Backend re-derive kapan pun.
// Semua input publik (dapat direkonstruksi dari DB + RPC) — bukan gate security.

import {
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  toBytes,
  type Hex,
} from 'viem';

export const DERIVATION_TAG = 'v1_ccc_xxx_vvv' as const;

const PARAMS_CREATED = parseAbiParameters('string, string, uint256');
const PARAMS_GUARANTOR = parseAbiParameters('string, string, address, uint256');
const PARAMS_NOTARY = parseAbiParameters('string, address, uint256, uint256');
const PARAMS_ASSEMBLED = parseAbiParameters('bytes32, bytes32, bytes32');

export type DeriveConfirmationCodeInput = {
  auctionCode: string;
  auctionCreatedAt: Date;
  auctionId: string;
  guarantorWallet: Hex;
  guarantorApprovedAt: Date;
  notaryWallet: Hex;
  nonce: bigint;
  expiry: bigint;
};

export type DerivedConfirmationCode = {
  code: string;
  codeHash: Hex;
};

export function deriveConfirmationCode(
  input: DeriveConfirmationCodeInput,
): DerivedConfirmationCode {
  const createdAtSec = BigInt(Math.floor(input.auctionCreatedAt.getTime() / 1000));
  const guarantorApprovedSec = BigInt(
    Math.floor(input.guarantorApprovedAt.getTime() / 1000),
  );

  const ccc = keccak256(
    encodeAbiParameters(PARAMS_CREATED, [
      'AUCTION_CREATED',
      input.auctionCode,
      createdAtSec,
    ]),
  );

  const xxx = keccak256(
    encodeAbiParameters(PARAMS_GUARANTOR, [
      'GUARANTOR_APPROVED',
      input.auctionId,
      input.guarantorWallet,
      guarantorApprovedSec,
    ]),
  );

  const vvv = keccak256(
    encodeAbiParameters(PARAMS_NOTARY, [
      'NOTARY_APPROVAL',
      input.notaryWallet,
      input.nonce,
      input.expiry,
    ]),
  );

  const assembled = keccak256(
    encodeAbiParameters(PARAMS_ASSEMBLED, [ccc, xxx, vvv]),
  );

  const code = BigInt(assembled)
    .toString(36)
    .toUpperCase()
    .padStart(8, '0')
    .slice(0, 8);

  const codeHash = keccak256(toBytes(code));

  return { code, codeHash };
}