// @file packages/domain/src/authorization.ts

/**
 * Canonical authorization policies for PARALEL.
 *
 * File ini hanya mengevaluasi fakta yang diberikan caller.
 * File ini tidak:
 *
 * - membaca session;
 * - membaca database;
 * - membaca blockchain;
 * - memverifikasi signature;
 * - mengirim transaction;
 * - bergantung pada React, Next.js, Drizzle, atau Cloudflare Workers.
 *
 * API/Application Service wajib mengambil actor dan resource dari sumber
 * tepercaya sebelum memanggil policy ini.
 */

import type {
  Address,
} from 'viem';

import {
  ZERO_ADDRESS,
} from '@paralel/contracts';

import {
  assertDomain,
  type DomainErrorCode,
} from './errors';

import {
  isBiddableEffectiveStatus,
  type EffectiveAuctionStatus,
} from './effective-status';

import {
  resolveRefundEligibility,
  type RefundEligibilityInput,
  type RefundEligibilityResult,
} from './deadlines';

export const KYC_STATUSES = [
  'NONE',
  'PENDING',
  'VERIFIED',
  'FAILED',
] as const;

export type KycStatus =
  (typeof KYC_STATUSES)[number];

export const PARTNER_TYPES = [
  'NOTARY',
  'GUARANTOR',
] as const;

export type PartnerType =
  (typeof PARTNER_TYPES)[number];

export const PARTNER_LIFECYCLE_STATUSES = [
  'ACTIVE',
  'SUSPENDING',
  'INACTIVE',
] as const;

export type PartnerLifecycleStatus =
  (typeof PARTNER_LIFECYCLE_STATUSES)[number];

export const PARTNER_SYNC_STATUSES = [
  'SYNCED',
  'PENDING',
  'FAILED',
  'DRIFTED',
] as const;

export type PartnerSyncStatus =
  (typeof PARTNER_SYNC_STATUSES)[number];

export type AuthorizationRoles = Readonly<{
  user: true;
  guarantor: boolean;
  notary: boolean;
  userAdmin: boolean;
  platformAdmin: boolean;
}>;

export type AuthorizationActor = Readonly<{
  wallet: Address;
  authenticated: boolean;
  chainId: number;
  expectedChainId: number;

  userId?: string | null;
  kycStatus: KycStatus;

  roles: AuthorizationRoles;

  partner?: Readonly<{
    partnerId: string;
    type: PartnerType;
    lifecycleStatus:
      PartnerLifecycleStatus;
    dbActive: boolean;
    onchainActive: boolean;
    syncStatus: PartnerSyncStatus;
  }> | null;
}>;

export type AuctionAuthorizationResource =
  Readonly<{
    auctionId: string;
    auctionCode: string;
    status: EffectiveAuctionStatus;

    consignorWallet: Address;

    guarantorPartnerId?:
      | string
      | null;

    guarantorWallet?:
      | Address
      | null;

    notaryPartnerId?:
      | string
      | null;

    notaryWallet?:
      | Address
      | null;

    activeCandidateWallet?:
      | Address
      | null;

    winnerWallet?:
      | Address
      | null;

    manifestFrozen?: boolean;
    guarantorApproved?: boolean;
    notaryApproved?: boolean;
    confirmationReady?: boolean;
  }>;

export type AuthorizationDecision =
  | Readonly<{
      allowed: true;
      reason: 'ALLOWED';
      code: null;
    }>
  | Readonly<{
      allowed: false;
      reason: AuthorizationDenialReason;
      code: DomainErrorCode;
    }>;

export type AuthorizationDenialReason =
  | 'UNAUTHENTICATED'
  | 'WRONG_NETWORK'
  | 'KYC_NOT_VERIFIED'
  | 'ROLE_REQUIRED'
  | 'RESOURCE_NOT_OWNED'
  | 'RESOURCE_NOT_ASSIGNED'
  | 'PARTNER_CONTEXT_MISSING'
  | 'PARTNER_TYPE_MISMATCH'
  | 'PARTNER_NOT_ACTIVE'
  | 'PARTNER_NOT_SYNCED'
  | 'INVALID_AUCTION_STATE'
  | 'MANIFEST_NOT_FROZEN'
  | 'GUARANTOR_APPROVAL_REQUIRED'
  | 'NOTARY_APPROVAL_REQUIRED'
  | 'CONFIRMATION_NOT_READY'
  | 'CONSIGNOR_CANNOT_BID'
  | 'NOT_ACTIVE_CANDIDATE'
  | 'WINNER_MISMATCH'
  | 'REFUND_NOT_AVAILABLE'
  | 'OWNER_ROLE_REQUIRED'
  | 'USER_ADMIN_ROLE_REQUIRED';

const ALLOW: AuthorizationDecision =
  Object.freeze({
    allowed: true,
    reason: 'ALLOWED',
    code: null,
  });

function deny(
  reason: AuthorizationDenialReason,
  code: DomainErrorCode,
): AuthorizationDecision {
  return Object.freeze({
    allowed: false,
    reason,
    code,
  });
}

function normalizeAddress(
  value:
    | Address
    | null
    | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const normalized =
    value.toLowerCase();

  if (
    normalized ===
    ZERO_ADDRESS.toLowerCase()
  ) {
    return null;
  }

  return normalized;
}

export function sameWallet(
  left:
    | Address
    | null
    | undefined,
  right:
    | Address
    | null
    | undefined,
): boolean {
  const normalizedLeft =
    normalizeAddress(left);

  const normalizedRight =
    normalizeAddress(right);

  return (
    normalizedLeft !== null &&
    normalizedRight !== null &&
    normalizedLeft ===
      normalizedRight
  );
}

export function requireAuthenticatedActor(
  actor: AuthorizationActor,
): AuthorizationDecision {
  if (!actor.authenticated) {
    return deny(
      'UNAUTHENTICATED',
      'UNAUTHENTICATED',
    );
  }

  if (
    actor.chainId !==
    actor.expectedChainId
  ) {
    return deny(
      'WRONG_NETWORK',
      'WRONG_NETWORK',
    );
  }

  return ALLOW;
}

export function requireVerifiedKyc(
  actor: AuthorizationActor,
): AuthorizationDecision {
  const authentication =
    requireAuthenticatedActor(actor);

  if (!authentication.allowed) {
    return authentication;
  }

  if (
    actor.kycStatus !==
    'VERIFIED'
  ) {
    return deny(
      'KYC_NOT_VERIFIED',
      'ROLE_FORBIDDEN',
    );
  }

  return ALLOW;
}

export function requirePlatformAdmin(
  actor: AuthorizationActor,
): AuthorizationDecision {
  const authentication =
    requireAuthenticatedActor(actor);

  if (!authentication.allowed) {
    return authentication;
  }

  if (
    !actor.roles.platformAdmin
  ) {
    return deny(
      'OWNER_ROLE_REQUIRED',
      'ROLE_FORBIDDEN',
    );
  }

  return ALLOW;
}

export function requireUserAdmin(
  actor: AuthorizationActor,
): AuthorizationDecision {
  const authentication =
    requireAuthenticatedActor(actor);

  if (!authentication.allowed) {
    return authentication;
  }

  if (!actor.roles.userAdmin) {
    return deny(
      'USER_ADMIN_ROLE_REQUIRED',
      'ROLE_FORBIDDEN',
    );
  }

  return ALLOW;
}

function requirePartner(
  actor: AuthorizationActor,
  requiredType: PartnerType,
  options: {
    allowSuspendingForExistingObligation?: boolean;
  } = {},
): AuthorizationDecision {
  const authentication =
    requireAuthenticatedActor(actor);

  if (!authentication.allowed) {
    return authentication;
  }

  const requiredRole =
    requiredType === 'GUARANTOR'
      ? actor.roles.guarantor
      : actor.roles.notary;

  if (!requiredRole) {
    return deny(
      'ROLE_REQUIRED',
      'ROLE_FORBIDDEN',
    );
  }

  if (!actor.partner) {
    return deny(
      'PARTNER_CONTEXT_MISSING',
      'ROLE_FORBIDDEN',
    );
  }

  if (
    actor.partner.type !==
    requiredType
  ) {
    return deny(
      'PARTNER_TYPE_MISMATCH',
      'ROLE_FORBIDDEN',
    );
  }

  if (
    actor.partner.syncStatus !==
    'SYNCED'
  ) {
    return deny(
      'PARTNER_NOT_SYNCED',
      'PARTNER_REGISTRY_DRIFT',
    );
  }

  if (
    !actor.partner.dbActive ||
    !actor.partner.onchainActive
  ) {
    const canCompleteExistingObligation =
      options.allowSuspendingForExistingObligation ===
        true &&
      actor.partner.lifecycleStatus ===
        'SUSPENDING';

    if (
      !canCompleteExistingObligation
    ) {
      return deny(
        'PARTNER_NOT_ACTIVE',
        'PARTNER_INACTIVE',
      );
    }
  }

  if (
    actor.partner.lifecycleStatus ===
    'INACTIVE'
  ) {
    return deny(
      'PARTNER_NOT_ACTIVE',
      'PARTNER_INACTIVE',
    );
  }

  return ALLOW;
}

function requireAuctionOwner(
  actor: AuthorizationActor,
  auction: AuctionAuthorizationResource,
): AuthorizationDecision {
  if (
    !sameWallet(
      actor.wallet,
      auction.consignorWallet,
    )
  ) {
    return deny(
      'RESOURCE_NOT_OWNED',
      'RESOURCE_FORBIDDEN',
    );
  }

  return ALLOW;
}

function requireAssignedGuarantor(
  actor: AuthorizationActor,
  auction: AuctionAuthorizationResource,
): AuthorizationDecision {
  if (!actor.partner) {
    return deny(
      'PARTNER_CONTEXT_MISSING',
      'ROLE_FORBIDDEN',
    );
  }

  const partnerIdMatches =
    auction.guarantorPartnerId
      ? actor.partner.partnerId ===
        auction.guarantorPartnerId
      : false;

  const walletMatches =
    auction.guarantorWallet
      ? sameWallet(
          actor.wallet,
          auction.guarantorWallet,
        )
      : false;

  if (
    !partnerIdMatches &&
    !walletMatches
  ) {
    return deny(
      'RESOURCE_NOT_ASSIGNED',
      'RESOURCE_FORBIDDEN',
    );
  }

  return ALLOW;
}

function requireAssignedNotary(
  actor: AuthorizationActor,
  auction: AuctionAuthorizationResource,
): AuthorizationDecision {
  if (!actor.partner) {
    return deny(
      'PARTNER_CONTEXT_MISSING',
      'ROLE_FORBIDDEN',
    );
  }

  const partnerIdMatches =
    auction.notaryPartnerId
      ? actor.partner.partnerId ===
        auction.notaryPartnerId
      : false;

  const walletMatches =
    auction.notaryWallet
      ? sameWallet(
          actor.wallet,
          auction.notaryWallet,
        )
      : false;

  if (
    !partnerIdMatches &&
    !walletMatches
  ) {
    return deny(
      'RESOURCE_NOT_ASSIGNED',
      'RESOURCE_FORBIDDEN',
    );
  }

  return ALLOW;
}

export function canCreateAuction(
  actor: AuthorizationActor,
): AuthorizationDecision {
  return requireVerifiedKyc(actor);
}

export function canEditAuctionDraft(
  actor: AuthorizationActor,
  auction: AuctionAuthorizationResource,
): AuthorizationDecision {
  const authentication =
    requireAuthenticatedActor(actor);

  if (!authentication.allowed) {
    return authentication;
  }

  const ownership =
    requireAuctionOwner(
      actor,
      auction,
    );

  if (!ownership.allowed) {
    return ownership;
  }

  if (
    auction.status !==
    'CREATED'
  ) {
    return deny(
      'INVALID_AUCTION_STATE',
      'AUCTION_STATE_CHANGED',
    );
  }

  return ALLOW;
}

export function canSubmitAuction(
  actor: AuthorizationActor,
  auction: AuctionAuthorizationResource,
): AuthorizationDecision {
  const kyc =
    requireVerifiedKyc(actor);

  if (!kyc.allowed) {
    return kyc;
  }

  const ownership =
    requireAuctionOwner(
      actor,
      auction,
    );

  if (!ownership.allowed) {
    return ownership;
  }

  if (
    auction.status !==
    'CREATED'
  ) {
    return deny(
      'INVALID_AUCTION_STATE',
      'AUCTION_STATE_CHANGED',
    );
  }

  if (
    auction.manifestFrozen !== true
  ) {
    return deny(
      'MANIFEST_NOT_FROZEN',
      'INVALID_INPUT',
    );
  }

  return ALLOW;
}

export function canApproveAsGuarantor(
  actor: AuthorizationActor,
  auction: AuctionAuthorizationResource,
): AuthorizationDecision {
  const partner =
    requirePartner(
      actor,
      'GUARANTOR',
    );

  if (!partner.allowed) {
    return partner;
  }

  const assignment =
    requireAssignedGuarantor(
      actor,
      auction,
    );

  if (!assignment.allowed) {
    return assignment;
  }

  if (
    auction.status !==
    'PENDING'
  ) {
    return deny(
      'INVALID_AUCTION_STATE',
      'AUCTION_STATE_CHANGED',
    );
  }

  if (
    auction.manifestFrozen !== true
  ) {
    return deny(
      'MANIFEST_NOT_FROZEN',
      'INVALID_INPUT',
    );
  }

  return ALLOW;
}

export function canRejectAsGuarantor(
  actor: AuthorizationActor,
  auction: AuctionAuthorizationResource,
): AuthorizationDecision {
  return canApproveAsGuarantor(
    actor,
    auction,
  );
}

/**
 * Notary Submission bersifat global setelah Guarantor approval.
 *
 * Notary belum harus assigned sebelum memenangkan first-to-sign race.
 */
export function canApproveAsNotary(
  actor: AuthorizationActor,
  auction: AuctionAuthorizationResource,
): AuthorizationDecision {
  const partner =
    requirePartner(
      actor,
      'NOTARY',
    );

  if (!partner.allowed) {
    return partner;
  }

  if (
    auction.status !==
    'PENDING'
  ) {
    return deny(
      'INVALID_AUCTION_STATE',
      'AUCTION_STATE_CHANGED',
    );
  }

  if (
    auction.manifestFrozen !== true
  ) {
    return deny(
      'MANIFEST_NOT_FROZEN',
      'INVALID_INPUT',
    );
  }

  if (
    auction.guarantorApproved !==
    true
  ) {
    return deny(
      'GUARANTOR_APPROVAL_REQUIRED',
      'AUCTION_STATE_CHANGED',
    );
  }

  if (
    auction.notaryApproved ===
    true
  ) {
    return deny(
      'NOTARY_APPROVAL_REQUIRED',
      'NOTARY_ALREADY_ASSIGNED',
    );
  }

  return ALLOW;
}

export function canConfirmAuction(
  actor: AuthorizationActor,
  auction: AuctionAuthorizationResource,
): AuthorizationDecision {
  const authentication =
    requireAuthenticatedActor(actor);

  if (!authentication.allowed) {
    return authentication;
  }

  const ownership =
    requireAuctionOwner(
      actor,
      auction,
    );

  if (!ownership.allowed) {
    return ownership;
  }

  if (
    auction.status !==
    'PENDING'
  ) {
    return deny(
      'INVALID_AUCTION_STATE',
      'AUCTION_STATE_CHANGED',
    );
  }

  if (
    auction.guarantorApproved !==
    true
  ) {
    return deny(
      'GUARANTOR_APPROVAL_REQUIRED',
      'AUCTION_STATE_CHANGED',
    );
  }

  if (
    auction.notaryApproved !==
    true
  ) {
    return deny(
      'NOTARY_APPROVAL_REQUIRED',
      'AUCTION_STATE_CHANGED',
    );
  }

  if (
    auction.confirmationReady !==
    true
  ) {
    return deny(
      'CONFIRMATION_NOT_READY',
      'AUCTION_STATE_CHANGED',
    );
  }

  return ALLOW;
}

export function canBidThroughApplication(
  actor: AuthorizationActor,
  auction: AuctionAuthorizationResource,
): AuthorizationDecision {
  const kyc =
    requireVerifiedKyc(actor);

  if (!kyc.allowed) {
    return kyc;
  }

  if (
    sameWallet(
      actor.wallet,
      auction.consignorWallet,
    )
  ) {
    return deny(
      'CONSIGNOR_CANNOT_BID',
      'RESOURCE_FORBIDDEN',
    );
  }

  if (
    !isBiddableEffectiveStatus(
      auction.status,
    )
  ) {
    return deny(
      'INVALID_AUCTION_STATE',
      'AUCTION_STATE_CHANGED',
    );
  }

  return ALLOW;
}

export function canSignAward(
  actor: AuthorizationActor,
  auction: AuctionAuthorizationResource,
): AuthorizationDecision {
  const authentication =
    requireAuthenticatedActor(actor);

  if (!authentication.allowed) {
    return authentication;
  }

  if (
    auction.status !==
    'AWARDING'
  ) {
    return deny(
      'INVALID_AUCTION_STATE',
      'AUCTION_STATE_CHANGED',
    );
  }

  if (
    !sameWallet(
      actor.wallet,
      auction.activeCandidateWallet,
    )
  ) {
    return deny(
      'NOT_ACTIVE_CANDIDATE',
      'RESOURCE_FORBIDDEN',
    );
  }

  return ALLOW;
}

export function canMarkCollected(
  actor: AuthorizationActor,
  auction: AuctionAuthorizationResource,
): AuthorizationDecision {
  const partner =
    requirePartner(
      actor,
      'GUARANTOR',
      {
        allowSuspendingForExistingObligation:
          true,
      },
    );

  if (!partner.allowed) {
    return partner;
  }

  const assignment =
    requireAssignedGuarantor(
      actor,
      auction,
    );

  if (!assignment.allowed) {
    return assignment;
  }

  if (
    auction.status !==
    'COLLECTION'
  ) {
    return deny(
      'INVALID_AUCTION_STATE',
      'AUCTION_STATE_CHANGED',
    );
  }

  return ALLOW;
}

export function canMarkWithdrawn(
  actor: AuthorizationActor,
  auction: AuctionAuthorizationResource,
): AuthorizationDecision {
  const partner =
    requirePartner(
      actor,
      'GUARANTOR',
      {
        allowSuspendingForExistingObligation:
          true,
      },
    );

  if (!partner.allowed) {
    return partner;
  }

  const assignment =
    requireAssignedGuarantor(
      actor,
      auction,
    );

  if (!assignment.allowed) {
    return assignment;
  }

  if (
    auction.status !==
    'PASSED_IN'
  ) {
    return deny(
      'INVALID_AUCTION_STATE',
      'AUCTION_STATE_CHANGED',
    );
  }

  return ALLOW;
}

export function canWithdrawRefund(
  actor: AuthorizationActor,
  auction: AuctionAuthorizationResource,
  refundInput: Omit<
    RefundEligibilityInput,
    'bidder'
  >,
): AuthorizationDecision & {
  refund:
    RefundEligibilityResult;
} {
  const authentication =
    requireAuthenticatedActor(actor);

  const refund =
    resolveRefundEligibility({
      ...refundInput,
      bidder: actor.wallet,
    });

  if (!authentication.allowed) {
    return {
      ...authentication,
      refund,
    };
  }

  if (!refund.eligible) {
    return {
      ...deny(
        'REFUND_NOT_AVAILABLE',
        'AUCTION_STATE_CHANGED',
      ),
      refund,
    };
  }

  if (
    auction.winnerWallet &&
    sameWallet(
      actor.wallet,
      auction.winnerWallet,
    )
  ) {
    return {
      ...deny(
        'WINNER_MISMATCH',
        'RESOURCE_FORBIDDEN',
      ),
      refund,
    };
  }

  return {
    ...ALLOW,
    refund,
  };
}

export function canWithdrawConsignor(
  actor: AuthorizationActor,
  auction: AuctionAuthorizationResource,
): AuthorizationDecision {
  const authentication =
    requireAuthenticatedActor(actor);

  if (!authentication.allowed) {
    return authentication;
  }

  const ownership =
    requireAuctionOwner(
      actor,
      auction,
    );

  if (!ownership.allowed) {
    return ownership;
  }

  if (
    auction.status !==
    'CLAIM_PERIOD'
  ) {
    return deny(
      'INVALID_AUCTION_STATE',
      'AUCTION_STATE_CHANGED',
    );
  }

  return ALLOW;
}

export function canReuseRound(
  actor: AuthorizationActor,
  auction: AuctionAuthorizationResource,
): AuthorizationDecision {
  const authentication =
    requireAuthenticatedActor(actor);

  if (!authentication.allowed) {
    return authentication;
  }

  const ownership =
    requireAuctionOwner(
      actor,
      auction,
    );

  if (!ownership.allowed) {
    return ownership;
  }

  if (
    auction.status !==
    'PASSED_IN'
  ) {
    return deny(
      'INVALID_AUCTION_STATE',
      'AUCTION_STATE_CHANGED',
    );
  }

  return ALLOW;
}

export function canReviewKyc(
  actor: AuthorizationActor,
): AuthorizationDecision {
  return requireUserAdmin(actor);
}

export function canManagePartners(
  actor: AuthorizationActor,
): AuthorizationDecision {
  return requirePlatformAdmin(actor);
}

export function canManageUserAdmins(
  actor: AuthorizationActor,
): AuthorizationDecision {
  return requirePlatformAdmin(actor);
}

export function assertAuthorized(
  decision: AuthorizationDecision,
  message?: string,
): asserts decision is Extract<
  AuthorizationDecision,
  { allowed: true }
> {
  assertDomain(
    decision.allowed,
    decision.allowed
      ? 'RESOURCE_FORBIDDEN'
      : decision.code,
    message ??
      (
        decision.allowed
          ? 'Authorization failed.'
          : `Authorization denied: ${decision.reason}`
      ),
    decision.allowed
      ? {}
      : {
          details: {
            reason:
              decision.reason,
          },
        },
  );
}

/**
 * Optional helper untuk memastikan partner yang telah assigned sama dengan
 * authenticated partner. Digunakan ketika Notary membuka resource yang sudah
 * dimenangkannya setelah first-to-sign.
 */
export function canAccessAssignedNotaryResource(
  actor: AuthorizationActor,
  auction: AuctionAuthorizationResource,
): AuthorizationDecision {
  const partner =
    requirePartner(
      actor,
      'NOTARY',
      {
        allowSuspendingForExistingObligation:
          true,
      },
    );

  if (!partner.allowed) {
    return partner;
  }

  return requireAssignedNotary(
    actor,
    auction,
  );
}
