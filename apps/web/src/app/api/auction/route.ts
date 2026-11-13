import type { TransactionSql } from 'postgres';
import { isAddress, type Address, type Hex } from 'viem';

import {
  ContractPartnerType,
  GUARANTOR_COMPATIBILITY_CATEGORY,
  USDC_DECIMALS,
  readPartnerState,
} from '@paralel/contracts';
import {
  assertAuthorized,
  canCreateAuction,
  createDomainError,
} from '@paralel/domain';

import { executeApiHandler } from '@/lib/api/handler';
import { toTransactionJsonValue } from '@/lib/api/idempotency';
import { executeMutation } from '@/lib/api/mutation-executor';
import { allocateAuctionCode } from '@/lib/auction/auction-code';
import {
  isActiveDocumentConflict,
  isCanonicalGuarantorRegistryState,
} from '@/lib/auction/create-security';
import {
  parseAuctionCreateInput,
  type AuctionFileInput,
} from '@/lib/auction/create-input';
import { readAuctionCreationPolicy } from '@/lib/auction/chain-policy';
import { computeSpecHash } from '@/lib/auction/spec-hash';
import { requireWorkspace } from '@/lib/auth';
import { getPublicClient } from '@/lib/contracts';
import { getTransactionClient } from '@/lib/database';
import { verifyStoredObject } from '@/lib/storage/presign';

type Partner = Readonly<{
  id: string;
  city: string;
  wallet: Address;
  category: string;
}>;

type PartnerRow = Readonly<{
  id: string;
  type: string;
  active: boolean;
  category: string | null;
  city: string | null;
  wallet: string;
}>;

function checksumBase64(
  hash: Hex,
): string {
  return Buffer
    .from(
      hash.slice(2),
      'hex',
    )
    .toString('base64');
}

async function findPartner(
  id: string,
  auctionCategory: string,
): Promise<Partner> {
  const sql =
    getTransactionClient();

  const rows =
    await sql<PartnerRow[]>`
      SELECT
        p.id,
        p.type,
        p.active,
        p.category,
        p.city,
        u.wallet
      FROM partners p
      JOIN users u
        ON u.id = p.user_id
      WHERE p.id = ${id}
      LIMIT 1
    `;

  const partner =
    rows[0];

  if (
    !partner ||
    partner.type !==
      'GUARANTOR' ||
    partner.active !== true
  ) {
    throw createDomainError(
      'PARTNER_INACTIVE',
      'Selected Guarantor does not exist or is inactive.',
      {
        details: {
          guarantorId:
            id,
        },
      },
    );
  }

  if (
    (
      partner.category !==
        'ALL' &&
      partner.category !==
        auctionCategory
    ) ||
    typeof partner.city !==
      'string' ||
    partner.city.trim()
      .length === 0 ||
    !isAddress(
      partner.wallet,
    )
  ) {
    throw createDomainError(
      'PARTNER_REGISTRY_DRIFT',
      'Selected Guarantor database state is not canonical.',
      {
        details: {
          guarantorId:
            partner.id,
          expectedCategory:
            auctionCategory,
        },
      },
    );
  }

  return {
    id:
      partner.id,
    city:
      partner.city.trim(),
    wallet:
      partner.wallet
        .toLowerCase() as Address,
    category:
      partner.category!,
  };
}

async function assertRegistry(partner: Partner): Promise<void> {
  const state = await readPartnerState(getPublicClient(), partner.wallet);
  if (
    !isCanonicalGuarantorRegistryState(
      state,
      {
        pType:
          ContractPartnerType
            .GUARANTOR,
        category:
          GUARANTOR_COMPATIBILITY_CATEGORY,
      },
    )
  ) {
    throw createDomainError('PARTNER_REGISTRY_DRIFT', 'Selected Guarantor database and on-chain registry state differ.');
  }
}
async function verifyFiles(
  files:
    readonly AuctionFileInput[],
  actorWallet:
    Address,
): Promise<void> {
  await Promise.all(
    files.map(
      async (file) => {
    const result = await verifyStoredObject({
      key: file.key,
      purpose:
        file.slot === 'doc'
          ? 'auction-item-documents'
          : 'auction-item-photos',
      slot: file.slot,
      actorWallet:
        actorWallet
          .toLowerCase(),
      contentType: file.mime,
      sizeBytes: file.sizeBytes,
      contentHash: file.contentHash,
      checksumSha256: checksumBase64(file.contentHash),
      filename: file.filename,
      extension: file.extension,
      width: file.width,
      height: file.height,
    });
        if (!result.ok) {
          throw createDomainError(
            'INVALID_INPUT',
            'Stored object verification failed.',
            {
              details: {
                slot:
                  file.slot,
                reason:
                  result.reason,
              },
            },
          );
        }
      },
    ),
  );
}
async function lockPartner(
  transaction: TransactionSql,
  partner: Partner,
): Promise<void> {
  const rows = await transaction<{ id: string }[]>`
    SELECT p.id
    FROM partners p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = ${partner.id}
      AND p.type = 'GUARANTOR'
      AND p.active = true
      AND p.category = ${partner.category}
      AND lower(u.wallet) = ${partner.wallet.toLowerCase()}
    FOR UPDATE OF p, u
  `;
  if (!rows[0]) {
    throw createDomainError(
      'PARTNER_REGISTRY_DRIFT',
      'Selected Guarantor changed during auction creation.',
      {
        details: {
          guarantorId:
            partner.id,
        },
      },
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  return executeApiHandler(request, async (requestContext) => {
    const authentication = await requireWorkspace(request, requestContext.correlationId, 'USER');
    assertAuthorized(canCreateAuction(authentication.actor));
    if (!authentication.context.user.userId) {
      throw createDomainError('RESOURCE_FORBIDDEN', 'Authenticated user record is required.');
    }
    let raw: unknown;
    try {
      raw =
        await request.json();
    } catch {
      throw createDomainError(
        'INVALID_INPUT',
        'Request body must contain valid JSON.',
      );
    }
    const policy =
      await readAuctionCreationPolicy(
        getPublicClient(),
      );
    const input =
      parseAuctionCreateInput(
        raw,
        requestContext
          .receivedAt,
        policy,
      );
    const partner = await findPartner(
      input.guarantorId,
      input.category,
    );
    await assertRegistry(partner);
    await verifyFiles(
      input.files,
      authentication
        .actor
        .wallet,
    );
    const photos = ['photo1', 'photo2', 'photo3', 'photo4', 'photo5'].map(
      (slot) => input.files.find((file) => file.slot === slot)!,
    );
    const document = input.files.find((file) => file.slot === 'doc')!;
    const specHash = computeSpecHash({
      title: input.title,
      description: input.description,
      condition: input.condition,
      conditionNotes: input.conditionNotes,
      documentType: input.documentType,
      documentNumber: input.documentNumber,
      chassisNumber: input.chassisNumber,
      serialNumber: input.serialNumber,
      spec: input.spec,
      photoContentHashes: photos.map((file) => file.contentHash) as [Hex, Hex, Hex, Hex, Hex],
      documentScanContentHash: document.contentHash,
    });
    const requestBody = toTransactionJsonValue({
      ...input,
      startingBid: input.startingBid.toString(),
      bidIncrement: input.bidIncrement.toString(),
      openAt: input.openAt.toISOString(),
      closeAt: input.closeAt.toISOString(),
    });
    return executeMutation({
      request,
      requestContext,
      authentication,
      routeKey: 'POST:/api/auction',
      requestBody,
      audit: {
        action: 'AUCTION_CREATED',
        resourceType: 'AUCTION',
        resourceId: null,
        metadata: toTransactionJsonValue({ category: input.category, guarantorId: partner.id }),
      },
      operation: async (transaction) => {
        await lockPartner(transaction, partner);
        const auctionId = crypto.randomUUID();
        const auctionCode =
          await allocateAuctionCode(
            transaction,
            {
              city:
                partner.city,
              category:
                input.category,
              now:
                requestContext
                  .receivedAt,
            },
          );
        await transaction`
          INSERT INTO auctions (
            id, auction_code, consignor_id, guarantor_id, notary_id,
            category, currency, token_decimals, status, current_round,
            pending_at, pending_deadline, fee_config_id
          ) VALUES (
            ${auctionId}, ${auctionCode}, ${authentication.context.user.userId}, ${partner.id}, NULL,
            ${input.category}, 'USDC', ${USDC_DECIMALS}, 'CREATED', 1,
            NULL, NULL, NULL
          )
        `;
        try {
          await transaction`
            INSERT INTO auction_assets (
              auction_id, title, description, condition, condition_notes,
              document_type, document_number, chassis_number, serial_number,
              spec, spec_hash
            ) VALUES (
              ${auctionId}, ${input.title}, ${input.description}, ${input.condition}, ${input.conditionNotes},
              ${input.documentType}, ${input.documentNumber}, ${input.chassisNumber}, ${input.serialNumber},
              ${transaction.json(input.spec)}, ${Buffer.from(specHash.slice(2), 'hex')}
            )
          `;
        } catch (
          error: unknown
        ) {
          if (
            isActiveDocumentConflict(
              error,
            )
          ) {
            throw createDomainError(
              'ALREADY_PROCESSED',
              'An active auction already uses this document number.',
              {
                details: {
                  constraint:
                    'uq_active_document_number',
                  documentNumber:
                    input.documentNumber,
                },
                cause:
                  error,
              },
            );
          }

          throw error;
        }

        for (let index = 0; index < photos.length; index += 1) {
          const file = photos[index];
          await transaction`
            INSERT INTO auction_files (
              auction_id, kind, position, filename, extension, mime,
              width, height, size_bytes, content_hash, storage_url
            ) VALUES (
              ${auctionId}, 'PHOTO', ${index + 1}, ${file.filename}, ${file.extension}, ${file.mime},
              ${file.width}, ${file.height}, ${file.sizeBytes},
              ${Buffer.from(file.contentHash.slice(2), 'hex')}, ${file.key}
            )
          `;
        }
        await transaction`
          INSERT INTO auction_files (
            auction_id, kind, position, filename, extension, mime,
            width, height, size_bytes, content_hash, storage_url
          ) VALUES (
            ${auctionId}, 'DOCUMENT_SCAN', NULL, ${document.filename}, ${document.extension}, ${document.mime},
            ${document.width}, ${document.height}, ${document.sizeBytes},
            ${Buffer.from(document.contentHash.slice(2), 'hex')}, ${document.key}
          )
        `;
        await transaction`
          INSERT INTO auction_rounds (
            auction_id, round_no, starting_bid, bid_increment,
            scheduled_at, open_at, duration_hours, close_at, outcome
          ) VALUES (
            ${auctionId}, 1, ${input.startingBid}, ${input.bidIncrement},
            NULL, ${input.openAt}, ${input.durationHours}, ${input.closeAt}, NULL
          )
        `;
        await transaction`
          INSERT INTO status_log (
            auction_id, round_no, from_status, to_status,
            actor_user_id, reason, tx_hash
          ) VALUES (
            ${auctionId}, 1, NULL, 'CREATED',
            ${authentication.context.user.userId}, NULL, NULL
          )
        `;
        return {
          status: 201,
          body: toTransactionJsonValue({ data: { auctionId, auctionCode, status: 'CREATED', currentRound: 1 } }),
          audit: {
            resourceId: auctionId,
            metadata: toTransactionJsonValue({ auctionCode, category: input.category, guarantorId: partner.id }),
          },
        };
      },
    });
  });
}
