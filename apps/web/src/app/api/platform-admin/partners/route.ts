// @file apps/web/src/app/api/platform-admin/partners/route.ts
//
// Signed-session Platform Admin partner registry.
//
// GET returns active database metadata by canonical partner type.
// POST atomically creates or updates one database partner projection.
// Runtime partner authority still requires synchronized on-chain state.
import {
  assertAuthorized,
  canManagePartners,
  createDomainError,
} from '@paralel/domain';

import {
  and,
  eq,
} from 'drizzle-orm';

import {
  dataResponse,
  executeApiHandler,
  executeMutation,
  toTransactionJsonValue,
} from '@/lib/api';

import {
  requireWorkspace,
} from '@/lib/auth';

import {
  neon,
} from '@neondatabase/serverless';

import {
  drizzle,
} from 'drizzle-orm/neon-http';

import {
  parsePartnerPhotoKey,
  parsePartnerRegistration,
} from '@/lib/platform-admin/partner-security';

import * as schema from '@db/schema';

const sqlClient =
  neon(
    process.env
      .DATABASE_URL!,
  );

const db =
  drizzle(
    sqlClient,
    {
      schema,
    },
  );

type PartnerType =
  | 'NOTARY'
  | 'GUARANTOR';

type LockedUserRow =
  Readonly<{
    id:
      string;
    userType:
      string;
  }>;

type LockedPartnerRow =
  Readonly<{
    id:
      string;
    type:
      string;
    active:
      boolean;
  }>;

function parsePartnerType(
  request: Request,
): PartnerType {
  const type =
    new URL(
      request.url,
    ).searchParams.get(
      'type',
    );

  if (
    type === 'NOTARY' ||
    type === 'GUARANTOR'
  ) {
    return type;
  }

  throw createDomainError(
    'INVALID_INPUT',
    'type must be NOTARY or GUARANTOR.',
    {
      details: {
        field:
          'type',
      },
    },
  );
}

async function readJsonBody(
  request: Request,
): Promise<unknown> {
  try {
    return await request.json();
  } catch (
    error: unknown
  ) {
    throw createDomainError(
      'INVALID_INPUT',
      'Request body must contain valid JSON.',
      {
        cause:
          error,
      },
    );
  }
}

export async function GET(
  request: Request,
): Promise<Response> {
  return executeApiHandler(
    request,
    async (
      requestContext,
    ) => {
      const authentication =
        await requireWorkspace(
          request,
          requestContext
            .correlationId,
          'PLATFORM_ADMIN',
        );

      assertAuthorized(
        canManagePartners(
          authentication
            .actor,
        ),
      );

      const type =
        parsePartnerType(
          request,
        );

      const rows =
        await db
          .select({
            id:
              schema
                .partners
                .id,
            wallet:
              schema
                .users
                .wallet,
            type:
              schema
                .partners
                .type,
            name:
              schema
                .partners
                .name,
            category:
              schema
                .partners
                .category,
            city:
              schema
                .partners
                .city,
            documentNumber:
              schema
                .partners
                .documentNumber,
            address:
              schema
                .partners
                .address,
            photo:
              schema
                .partners
                .photo,
            active:
              schema
                .partners
                .active,
          })
          .from(
            schema.partners,
          )
          .innerJoin(
            schema.users,
            eq(
              schema
                .users
                .id,
              schema
                .partners
                .userId,
            ),
          )
          .where(
            and(
              eq(
                schema
                  .partners
                  .type,
                type,
              ),
              eq(
                schema
                  .partners
                  .active,
                true,
              ),
            ),
          );

      return dataResponse(
        rows,
        requestContext
          .correlationId,
      );
    },
  );
}

export async function POST(
  request: Request,
): Promise<Response> {
  return executeApiHandler(
    request,
    async (
      requestContext,
    ) => {
      const authentication =
        await requireWorkspace(
          request,
          requestContext
            .correlationId,
          'PLATFORM_ADMIN',
        );

      assertAuthorized(
        canManagePartners(
          authentication
            .actor,
        ),
      );

      const input =
        parsePartnerRegistration(
          await readJsonBody(
            request,
          ),
        );
      if (input.photo !== null) {
        parsePartnerPhotoKey(input.photo);
      }

      if (
        input.wallet ===
        authentication
          .actor
          .wallet
          .toLowerCase()
      ) {
        throw createDomainError(
          'INVALID_INPUT',
          'Platform Admin owner wallet cannot be registered as a partner.',
          {
            details: {
              field:
                'wallet',
            },
          },
        );
      }

      return executeMutation({
        request,
        requestContext,
        authentication,
        routeKey:
          'POST:/api/platform-admin/partners',
        requestBody:
          toTransactionJsonValue({
            wallet:
              input.wallet,
            type:
              input.type,
            name:
              input.name,
            category:
              input.category,
            city:
              input.city,
            documentNumber:
              input.documentNumber,
            address:
              input.address,
            photo:
              input.photo,
          }),
        audit: {
          action:
            'PLATFORM_ADMIN_PARTNER_PERSISTED',
          resourceType:
            'PARTNER',
          resourceId:
            input.wallet,
          metadata:
            toTransactionJsonValue({
              wallet:
                input.wallet,
              type:
                input.type,
            }),
        },
        operation:
          async (
            transaction,
          ) => {
            const userRows =
              await transaction<
                LockedUserRow[]
              >`
                SELECT
                  id,
                  user_type
                    AS "userType"
                FROM users
                WHERE
                  LOWER(wallet) =
                    ${input.wallet}
                FOR UPDATE
              `;

            if (
              userRows.length >
                1
            ) {
              throw new Error(
                'Partner user uniqueness projection is invalid.',
              );
            }

            let userId:
              string;

            const existingUser =
              userRows[0];

            if (existingUser) {
              if (
                existingUser.userType ===
                  'PLATFORM'
              ) {
                throw createDomainError(
                  'INVALID_INPUT',
                  'Platform wallet cannot be converted into a partner.',
                  {
                    details: {
                      wallet:
                        input.wallet,
                    },
                  },
                );
              }

              const updatedUsers =
                await transaction<
                  ReadonlyArray<
                    Readonly<{
                      id:
                        string;
                    }>
                  >
                >`
                  UPDATE users
                  SET
                    user_type =
                      ${input.type},
                    updated_at =
                      ${requestContext
                        .receivedAt}
                  WHERE
                    id =
                      ${existingUser.id}
                    AND user_type <>
                      'PLATFORM'
                  RETURNING id
                `;

              if (
                updatedUsers.length !==
                  1 ||
                !updatedUsers[0]
              ) {
                throw createDomainError(
                  'AUCTION_STATE_CHANGED',
                  'Partner user changed during registry mutation.',
                  {
                    retryable:
                      true,
                    details: {
                      wallet:
                        input.wallet,
                    },
                  },
                );
              }

              userId =
                updatedUsers[0].id;
            } else {
              const insertedUsers =
                await transaction<
                  ReadonlyArray<
                    Readonly<{
                      id:
                        string;
                    }>
                  >
                >`
                  INSERT INTO users (
                    wallet,
                    user_type,
                    preferred_language,
                    created_at,
                    updated_at
                  )
                  VALUES (
                    ${input.wallet},
                    ${input.type},
                    'EN',
                    ${requestContext
                      .receivedAt},
                    ${requestContext
                      .receivedAt}
                  )
                  RETURNING id
                `;

              if (
                insertedUsers.length !==
                  1 ||
                !insertedUsers[0]
              ) {
                throw new Error(
                  'Partner user insert returned no durable record.',
                );
              }

              userId =
                insertedUsers[0].id;
            }

            const partnerRows =
              await transaction<
                LockedPartnerRow[]
              >`
                SELECT
                  id,
                  type,
                  active
                FROM partners
                WHERE
                  user_id =
                    ${userId}
                FOR UPDATE
              `;

            if (
              partnerRows.length >
                1
            ) {
              throw new Error(
                'Partner registry uniqueness projection is invalid.',
              );
            }

            const existingPartner =
              partnerRows[0];

            if (
              existingPartner &&
              existingPartner.type !==
                input.type
            ) {
              throw createDomainError(
                'INVALID_INPUT',
                'Existing partner type is immutable.',
                {
                  details: {
                    wallet:
                      input.wallet,
                    currentType:
                      existingPartner.type,
                    requestedType:
                      input.type,
                  },
                },
              );
            }

            const result =
              existingPartner
                ? await transaction<
                    ReadonlyArray<
                      Readonly<{
                        id:
                          string;
                      }>
                    >
                  >`
                    UPDATE partners
                    SET
                      name =
                        ${input.name},
                      category =
                        ${input.category},
                      city =
                        ${input.city},
                      document_number =
                        ${input
                          .documentNumber},
                      address =
                        ${input.address},
                      photo =
                        ${input.photo},
                      active =
                        TRUE
                    WHERE
                      id =
                        ${existingPartner.id}
                      AND type =
                        ${input.type}
                    RETURNING id
                  `
                : await transaction<
                    ReadonlyArray<
                      Readonly<{
                        id:
                          string;
                      }>
                    >
                  >`
                    INSERT INTO partners (
                      user_id,
                      type,
                      name,
                      category,
                      city,
                      document_number,
                      address,
                      photo,
                      active,
                      created_at
                    )
                    VALUES (
                      ${userId},
                      ${input.type},
                      ${input.name},
                      ${input.category},
                      ${input.city},
                      ${input
                        .documentNumber},
                      ${input.address},
                      ${input.photo},
                      TRUE,
                      ${requestContext
                        .receivedAt}
                    )
                    RETURNING id
                  `;

            if (
              result.length !==
                1 ||
              !result[0]
            ) {
              throw createDomainError(
                'AUCTION_STATE_CHANGED',
                'Partner registry changed during mutation.',
                {
                  retryable:
                    true,
                  details: {
                    wallet:
                      input.wallet,
                  },
                },
              );
            }

            const mutationType =
              existingPartner
                ? (
                    existingPartner
                      .active
                      ? 'UPDATED'
                      : 'REACTIVATED'
                  )
                : 'CREATED';

            return {
              status:
                existingPartner
                  ? 200
                  : 201,
              body:
                toTransactionJsonValue({
                  ok:
                    true,
                  id:
                    result[0].id,
                  wallet:
                    input.wallet,
                  type:
                    input.type,
                  active:
                    true,
                  mutationType,
                  synchronization:
                    'DATABASE_RECORDED_ONCHAIN_REQUIRED',
                }),
              audit: {
                resourceId:
                  input.wallet,
                metadata:
                  toTransactionJsonValue({
                    partnerId:
                      result[0].id,
                    userId,
                    wallet:
                      input.wallet,
                    type:
                      input.type,
                    category:
                      input.category,
                    city:
                      input.city,
                    mutationType,
                    synchronization:
                      'DATABASE_RECORDED_ONCHAIN_REQUIRED',
                  }),
              },
            };
          },
      });
    },
  );
}
