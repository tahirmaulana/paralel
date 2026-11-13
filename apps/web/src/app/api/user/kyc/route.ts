import type {
  TransactionSql,
} from 'postgres';

import {
  createDomainError,
} from '@paralel/domain';

import {
  executeApiHandler,
  executeMutation,
  toTransactionJsonValue,
} from '@/lib/api';

import {
  requireWorkspace,
} from '@/lib/auth';

import {
  decideKycSubmission,
  parseKycSubmission,
  type KycSubmissionDecision,
  type KycSubmissionInput,
} from '@/lib/user/kyc-security';

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

type KycMutationResult =
  Readonly<{
    userId: string;
    decision:
      KycSubmissionDecision;
  }>;

async function upsertKyc(
  transaction: TransactionSql,
  wallet: string,
  input: KycSubmissionInput,
  now: Date,
): Promise<KycMutationResult> {
  /*
   * The users row serializes concurrent KYC submissions
   * for the same authenticated wallet.
   */
  const users =
    await transaction<
      ReadonlyArray<{
        id: string;
      }>
    >`
      INSERT INTO users (
        wallet,
        user_type,
        created_at,
        updated_at
      )
      VALUES (
        ${wallet.toLowerCase()},
        'PUBLIC',
        ${now},
        ${now}
      )
      ON CONFLICT (wallet)
      DO UPDATE SET
        wallet =
          EXCLUDED.wallet
      RETURNING id
    `;

  const user =
    users[0];

  if (!user) {
    throw createDomainError(
      'RPC_UNAVAILABLE',
      'User record could not be resolved.',
      {
        retryable:
          true,
      },
    );
  }

  const existingRows =
    await transaction<
      ReadonlyArray<{
        status:
          'UNVERIFIED' |
          'VERIFIED';
      }>
    >`
      SELECT status
      FROM kyc_profiles
      WHERE
        user_id =
          ${user.id}
      FOR UPDATE
    `;

  if (
    existingRows.length > 1
  ) {
    throw new Error(
      'KYC profile uniqueness projection is invalid.',
    );
  }

  const existingStatus =
    existingRows[0]
      ?.status ??
    null;

  const decision =
    decideKycSubmission(
      existingStatus,
    );

  if (
    decision.kind ===
      'INITIAL'
  ) {
    const inserted =
      await transaction<
        ReadonlyArray<{
          user_id: string;
        }>
      >`
        INSERT INTO kyc_profiles (
          user_id,
          full_name,
          nik,
          address,
          ktp_photo,
          admin_comment,
          face_verified,
          id_extracted_by_ai,
          status,
          verified_at,
          created_at,
          updated_at
        )
        VALUES (
          ${user.id},
          ${input.fullName},
          ${input.nik},
          ${input.address},
          ${input.ktpPhoto},
          NULL,
          false,
          false,
          'UNVERIFIED',
          NULL,
          ${now},
          ${now}
        )
        RETURNING user_id
      `;

    if (
      inserted.length !== 1
    ) {
      throw createDomainError(
        'AUCTION_STATE_CHANGED',
        'KYC state changed while the initial submission was being processed.',
        {
          retryable:
            true,
          details: {
            userId:
              user.id,
          },
        },
      );
    }
  } else {
    const updated =
      await transaction<
        ReadonlyArray<{
          user_id: string;
        }>
      >`
        UPDATE kyc_profiles
        SET
          full_name =
            ${input.fullName},
          nik =
            ${input.nik},
          address =
            ${input.address},
          ktp_photo =
            ${input.ktpPhoto},
          admin_comment =
            NULL,
          face_verified =
            false,
          id_extracted_by_ai =
            false,
          verified_at =
            NULL,
          status =
            'UNVERIFIED',
          updated_at =
            ${now}
        WHERE
          user_id =
            ${user.id}
          AND status =
            'UNVERIFIED'
        RETURNING user_id
      `;

    if (
      updated.length !== 1
    ) {
      throw createDomainError(
        'AUCTION_STATE_CHANGED',
        'KYC state changed while the resubmission was being processed.',
        {
          retryable:
            true,
          details: {
            userId:
              user.id,
          },
        },
      );
    }
  }

  return Object.freeze({
    userId:
      user.id,
    decision,
  });
}

export async function POST(
  request: Request,
): Promise<Response> {
  return executeApiHandler(
    request,
    async (requestContext) => {
      const authentication =
        await requireWorkspace(
          request,
          requestContext.correlationId,
          'USER',
        );

      const input =
        parseKycSubmission(
          await readJsonBody(
            request,
          ),
        );

      return executeMutation({
        request,
        requestContext,
        authentication,
        routeKey:
          'POST:/api/user/kyc',
        requestBody:
          toTransactionJsonValue(
            input,
          ),
        audit: {
          action:
            'USER_KYC_SUBMITTED',
          resourceType:
            'KYC_PROFILE',
          resourceId:
            authentication
              .context
              .user
              .userId,
          metadata: {
            submissionType:
              'DATABASE_LOCKED_DECISION',
          },
        },
        operation:
          async (transaction) => {
            const result =
              await upsertKyc(
                transaction,
                authentication
                  .actor
                  .wallet,
                input,
                requestContext
                  .receivedAt,
              );

            return {
              status: 200,
              body: {
                data: {
                  ok:
                    true,
                  userId:
                    result.userId,
                  kycStatus:
                    result
                      .decision
                      .resultingStatus,
                  submissionType:
                    result
                      .decision
                      .kind,
                },
              },
              audit: {
                resourceId:
                  result.userId,
                metadata: {
                  submissionType:
                    result
                      .decision
                      .kind,
                },
              },
            };
          },
      });
    },
  );
}
