// @file packages/domain/test/authorization.test.ts

import assert from 'node:assert/strict';
import {
  describe,
  it,
} from 'node:test';

import type {
  Address,
} from 'viem';

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
} from '@paralel/contracts';

import {
  assertAuthorized,
  canAccessAssignedNotaryResource,
  canApproveAsGuarantor,
  canApproveAsNotary,
  canBidThroughApplication,
  canConfirmAuction,
  canCreateAuction,
  canEditAuctionDraft,
  canManagePartners,
  canManageUserAdmins,
  canMarkCollected,
  canMarkWithdrawn,
  canRejectAsGuarantor,
  canReuseRound,
  canReviewKyc,
  canSignAward,
  canSubmitAuction,
  canWithdrawConsignor,
  canWithdrawRefund,
  requireAuthenticatedActor,
  requirePlatformAdmin,
  requireUserAdmin,
  requireVerifiedKyc,
  sameWallet,
  type AuctionAuthorizationResource,
  type AuthorizationActor,
  type AuthorizationDecision,
} from '../src/authorization';

import {
  DomainError,
} from '../src/errors';

const USER_WALLET =
  '0x1111111111111111111111111111111111111111' as Address;

const OTHER_USER_WALLET =
  '0x2222222222222222222222222222222222222222' as Address;

const GUARANTOR_WALLET =
  '0x3333333333333333333333333333333333333333' as Address;

const NOTARY_WALLET =
  '0x4444444444444444444444444444444444444444' as Address;

const USER_ADMIN_WALLET =
  '0x5555555555555555555555555555555555555555' as Address;

const PLATFORM_ADMIN_WALLET =
  '0x6666666666666666666666666666666666666666' as Address;

const WINNER_WALLET =
  '0x7777777777777777777777777777777777777777' as Address;

const GUARANTOR_PARTNER_ID =
  'partner-guarantor-001';

const NOTARY_PARTNER_ID =
  'partner-notary-001';

const CLOSE_AT =
  1_800_000_000n;

function actor(
  overrides:
    Partial<AuthorizationActor> = {},
): AuthorizationActor {
  return {
    wallet:
      USER_WALLET,
    authenticated:
      true,
    chainId:
      ARBITRUM_SEPOLIA_CHAIN_ID,
    expectedChainId:
      ARBITRUM_SEPOLIA_CHAIN_ID,
    userId:
      'user-001',
    kycStatus:
      'VERIFIED',
    roles: {
      user:
        true,
      guarantor:
        false,
      notary:
        false,
      userAdmin:
        false,
      platformAdmin:
        false,
    },
    partner:
      null,
    ...overrides,
  };
}

function guarantorActor(
  overrides:
    Partial<AuthorizationActor> = {},
): AuthorizationActor {
  return actor({
    wallet:
      GUARANTOR_WALLET,
    roles: {
      user:
        true,
      guarantor:
        true,
      notary:
        false,
      userAdmin:
        false,
      platformAdmin:
        false,
    },
    partner: {
      partnerId:
        GUARANTOR_PARTNER_ID,
      type:
        'GUARANTOR',
      lifecycleStatus:
        'ACTIVE',
      dbActive:
        true,
      onchainActive:
        true,
      syncStatus:
        'SYNCED',
    },
    ...overrides,
  });
}

function notaryActor(
  overrides:
    Partial<AuthorizationActor> = {},
): AuthorizationActor {
  return actor({
    wallet:
      NOTARY_WALLET,
    roles: {
      user:
        true,
      guarantor:
        false,
      notary:
        true,
      userAdmin:
        false,
      platformAdmin:
        false,
    },
    partner: {
      partnerId:
        NOTARY_PARTNER_ID,
      type:
        'NOTARY',
      lifecycleStatus:
        'ACTIVE',
      dbActive:
        true,
      onchainActive:
        true,
      syncStatus:
        'SYNCED',
    },
    ...overrides,
  });
}

function userAdminActor(
  overrides:
    Partial<AuthorizationActor> = {},
): AuthorizationActor {
  return actor({
    wallet:
      USER_ADMIN_WALLET,
    roles: {
      user:
        true,
      guarantor:
        false,
      notary:
        false,
      userAdmin:
        true,
      platformAdmin:
        false,
    },
    ...overrides,
  });
}

function platformAdminActor(
  overrides:
    Partial<AuthorizationActor> = {},
): AuthorizationActor {
  return actor({
    wallet:
      PLATFORM_ADMIN_WALLET,
    roles: {
      user:
        true,
      guarantor:
        false,
      notary:
        false,
      userAdmin:
        false,
      platformAdmin:
        true,
    },
    ...overrides,
  });
}

function auction(
  overrides:
    Partial<AuctionAuthorizationResource> = {},
): AuctionAuthorizationResource {
  return {
    auctionId:
      'auction-id-001',
    auctionCode:
      'AUC001',
    status:
      'CREATED',
    consignorWallet:
      USER_WALLET,
    guarantorPartnerId:
      GUARANTOR_PARTNER_ID,
    guarantorWallet:
      GUARANTOR_WALLET,
    notaryPartnerId:
      NOTARY_PARTNER_ID,
    notaryWallet:
      NOTARY_WALLET,
    activeCandidateWallet:
      null,
    winnerWallet:
      null,
    manifestFrozen:
      false,
    guarantorApproved:
      false,
    notaryApproved:
      false,
    confirmationReady:
      false,
    ...overrides,
  };
}

function assertAllowed(
  decision: AuthorizationDecision,
): void {
  assert.equal(
    decision.allowed,
    true,
  );

  assert.equal(
    decision.reason,
    'ALLOWED',
  );

  assert.equal(
    decision.code,
    null,
  );
}

function assertDenied(
  decision: AuthorizationDecision,
  reason:
    Exclude<
      AuthorizationDecision,
      { allowed: true }
    >['reason'],
  code:
    Exclude<
      AuthorizationDecision,
      { allowed: true }
    >['code'],
): void {
  assert.equal(
    decision.allowed,
    false,
  );

  if (decision.allowed) {
    return;
  }

  assert.equal(
    decision.reason,
    reason,
  );

  assert.equal(
    decision.code,
    code,
  );
}

function expectDomainError(
  action: () => unknown,
  expectedCode: DomainError['code'],
): void {
  assert.throws(
    action,
    (
      error: unknown,
    ) => {
      assert.equal(
        error instanceof DomainError,
        true,
      );

      if (
        !(error instanceof DomainError)
      ) {
        return false;
      }

      assert.equal(
        error.code,
        expectedCode,
      );

      return true;
    },
  );
}

describe(
  'shared authorization foundations',
  () => {
    it(
      'compares wallet addresses case-insensitively',
      () => {
        assert.equal(
          sameWallet(
            USER_WALLET,
            USER_WALLET.toUpperCase() as Address,
          ),
          true,
        );

        assert.equal(
          sameWallet(
            USER_WALLET,
            OTHER_USER_WALLET,
          ),
          false,
        );

        assert.equal(
          sameWallet(
            USER_WALLET,
            null,
          ),
          false,
        );
      },
    );

    it(
      'allows an authenticated actor on the expected chain',
      () => {
        assertAllowed(
          requireAuthenticatedActor(
            actor(),
          ),
        );
      },
    );

    it(
      'rejects an unauthenticated actor',
      () => {
        assertDenied(
          requireAuthenticatedActor(
            actor({
              authenticated:
                false,
            }),
          ),
          'UNAUTHENTICATED',
          'UNAUTHENTICATED',
        );
      },
    );

    it(
      'rejects an actor on the wrong chain',
      () => {
        assertDenied(
          requireAuthenticatedActor(
            actor({
              chainId:
                1,
            }),
          ),
          'WRONG_NETWORK',
          'WRONG_NETWORK',
        );
      },
    );

    it(
      'allows only VERIFIED KYC',
      () => {
        assertAllowed(
          requireVerifiedKyc(
            actor({
              kycStatus:
                'VERIFIED',
            }),
          ),
        );

        for (
          const kycStatus
          of [
            'NONE',
            'PENDING',
            'FAILED',
          ] as const
        ) {
          assertDenied(
            requireVerifiedKyc(
              actor({
                kycStatus,
              }),
            ),
            'KYC_NOT_VERIFIED',
            'ROLE_FORBIDDEN',
          );
        }
      },
    );

    it(
      'allows only the Platform Admin role for owner policies',
      () => {
        assertAllowed(
          requirePlatformAdmin(
            platformAdminActor(),
          ),
        );

        assertDenied(
          requirePlatformAdmin(
            actor(),
          ),
          'OWNER_ROLE_REQUIRED',
          'ROLE_FORBIDDEN',
        );
      },
    );

    it(
      'allows only User Admin role for KYC administration',
      () => {
        assertAllowed(
          requireUserAdmin(
            userAdminActor(),
          ),
        );

        assertDenied(
          requireUserAdmin(
            actor(),
          ),
          'USER_ADMIN_ROLE_REQUIRED',
          'ROLE_FORBIDDEN',
        );
      },
    );
  },
);

describe(
  'User auction creation policies',
  () => {
    it(
      'allows a verified user to create an auction',
      () => {
        assertAllowed(
          canCreateAuction(
            actor(),
          ),
        );
      },
    );

    it(
      'rejects auction creation without verified KYC',
      () => {
        assertDenied(
          canCreateAuction(
            actor({
              kycStatus:
                'PENDING',
            }),
          ),
          'KYC_NOT_VERIFIED',
          'ROLE_FORBIDDEN',
        );
      },
    );

    it(
      'allows the consignor to edit a CREATED draft',
      () => {
        assertAllowed(
          canEditAuctionDraft(
            actor(),
            auction({
              status:
                'CREATED',
            }),
          ),
        );
      },
    );

    it(
      'rejects draft editing by a different wallet',
      () => {
        assertDenied(
          canEditAuctionDraft(
            actor({
              wallet:
                OTHER_USER_WALLET,
            }),
            auction(),
          ),
          'RESOURCE_NOT_OWNED',
          'RESOURCE_FORBIDDEN',
        );
      },
    );

    it(
      'rejects editing after the auction leaves CREATED',
      () => {
        assertDenied(
          canEditAuctionDraft(
            actor(),
            auction({
              status:
                'PENDING',
            }),
          ),
          'INVALID_AUCTION_STATE',
          'AUCTION_STATE_CHANGED',
        );
      },
    );

    it(
      'allows submit when KYC, ownership, state, and manifest are valid',
      () => {
        assertAllowed(
          canSubmitAuction(
            actor(),
            auction({
              status:
                'CREATED',
              manifestFrozen:
                true,
            }),
          ),
        );
      },
    );

    it(
      'rejects submit when canonical manifest is not frozen',
      () => {
        assertDenied(
          canSubmitAuction(
            actor(),
            auction({
              status:
                'CREATED',
              manifestFrozen:
                false,
            }),
          ),
          'MANIFEST_NOT_FROZEN',
          'INVALID_INPUT',
        );
      },
    );
  },
);

describe(
  'Guarantor policies',
  () => {
    it(
      'allows the assigned active Guarantor to approve PENDING auction',
      () => {
        assertAllowed(
          canApproveAsGuarantor(
            guarantorActor(),
            auction({
              status:
                'PENDING',
              manifestFrozen:
                true,
            }),
          ),
        );
      },
    );

    it(
      'uses the same policy for Guarantor rejection',
      () => {
        assertAllowed(
          canRejectAsGuarantor(
            guarantorActor(),
            auction({
              status:
                'PENDING',
              manifestFrozen:
                true,
            }),
          ),
        );
      },
    );

    it(
      'rejects a Guarantor without assigned resource',
      () => {
        assertDenied(
          canApproveAsGuarantor(
            guarantorActor({
              partner: {
                partnerId:
                  'different-guarantor',
                type:
                  'GUARANTOR',
                lifecycleStatus:
                  'ACTIVE',
                dbActive:
                  true,
                onchainActive:
                  true,
                syncStatus:
                  'SYNCED',
              },
              wallet:
                OTHER_USER_WALLET,
            }),
            auction({
              status:
                'PENDING',
              manifestFrozen:
                true,
            }),
          ),
          'RESOURCE_NOT_ASSIGNED',
          'RESOURCE_FORBIDDEN',
        );
      },
    );

    it(
      'rejects an inactive Guarantor for new approval',
      () => {
        assertDenied(
          canApproveAsGuarantor(
            guarantorActor({
              partner: {
                partnerId:
                  GUARANTOR_PARTNER_ID,
                type:
                  'GUARANTOR',
                lifecycleStatus:
                  'INACTIVE',
                dbActive:
                  false,
                onchainActive:
                  false,
                syncStatus:
                  'SYNCED',
              },
            }),
            auction({
              status:
                'PENDING',
              manifestFrozen:
                true,
            }),
          ),
          'PARTNER_NOT_ACTIVE',
          'PARTNER_INACTIVE',
        );
      },
    );

    it(
      'rejects registry drift',
      () => {
        assertDenied(
          canApproveAsGuarantor(
            guarantorActor({
              partner: {
                partnerId:
                  GUARANTOR_PARTNER_ID,
                type:
                  'GUARANTOR',
                lifecycleStatus:
                  'ACTIVE',
                dbActive:
                  true,
                onchainActive:
                  false,
                syncStatus:
                  'DRIFTED',
              },
            }),
            auction({
              status:
                'PENDING',
              manifestFrozen:
                true,
            }),
          ),
          'PARTNER_NOT_SYNCED',
          'PARTNER_REGISTRY_DRIFT',
        );
      },
    );

    it(
      'allows assigned active Guarantor to mark COLLECTION as collected',
      () => {
        assertAllowed(
          canMarkCollected(
            guarantorActor(),
            auction({
              status:
                'COLLECTION',
            }),
          ),
        );
      },
    );

    it(
      'allows a SUSPENDING Guarantor to complete an existing collection obligation',
      () => {
        assertAllowed(
          canMarkCollected(
            guarantorActor({
              partner: {
                partnerId:
                  GUARANTOR_PARTNER_ID,
                type:
                  'GUARANTOR',
                lifecycleStatus:
                  'SUSPENDING',
                dbActive:
                  false,
                onchainActive:
                  false,
                syncStatus:
                  'SYNCED',
              },
            }),
            auction({
              status:
                'COLLECTION',
            }),
          ),
        );
      },
    );

    it(
      'allows assigned Guarantor to mark item withdrawn in PASSED_IN',
      () => {
        assertAllowed(
          canMarkWithdrawn(
            guarantorActor(),
            auction({
              status:
                'PASSED_IN',
            }),
          ),
        );
      },
    );

    it(
      'rejects mark collected outside COLLECTION',
      () => {
        assertDenied(
          canMarkCollected(
            guarantorActor(),
            auction({
              status:
                'AWARDING',
            }),
          ),
          'INVALID_AUCTION_STATE',
          'AUCTION_STATE_CHANGED',
        );
      },
    );

    it(
      'rejects mark withdrawn outside PASSED_IN',
      () => {
        assertDenied(
          canMarkWithdrawn(
            guarantorActor(),
            auction({
              status:
                'COLLECTION',
            }),
          ),
          'INVALID_AUCTION_STATE',
          'AUCTION_STATE_CHANGED',
        );
      },
    );
  },
);

describe(
  'Notary policies',
  () => {
    it(
      'allows an active Notary to join first-to-sign approval',
      () => {
        assertAllowed(
          canApproveAsNotary(
            notaryActor(),
            auction({
              status:
                'PENDING',
              manifestFrozen:
                true,
              guarantorApproved:
                true,
              notaryApproved:
                false,
            }),
          ),
        );
      },
    );

    it(
      'requires Guarantor approval before Notary approval',
      () => {
        assertDenied(
          canApproveAsNotary(
            notaryActor(),
            auction({
              status:
                'PENDING',
              manifestFrozen:
                true,
              guarantorApproved:
                false,
            }),
          ),
          'GUARANTOR_APPROVAL_REQUIRED',
          'AUCTION_STATE_CHANGED',
        );
      },
    );

    it(
      'rejects a later Notary after first assignment is complete',
      () => {
        assertDenied(
          canApproveAsNotary(
            notaryActor(),
            auction({
              status:
                'PENDING',
              manifestFrozen:
                true,
              guarantorApproved:
                true,
              notaryApproved:
                true,
            }),
          ),
          'NOTARY_APPROVAL_REQUIRED',
          'NOTARY_ALREADY_ASSIGNED',
        );
      },
    );

    it(
      'allows assigned Notary to access its resource',
      () => {
        assertAllowed(
          canAccessAssignedNotaryResource(
            notaryActor(),
            auction({
              status:
                'COLLECTION',
            }),
          ),
        );
      },
    );

    it(
      'rejects a Notary not assigned to the resource',
      () => {
        assertDenied(
          canAccessAssignedNotaryResource(
            notaryActor({
              partner: {
                partnerId:
                  'different-notary',
                type:
                  'NOTARY',
                lifecycleStatus:
                  'ACTIVE',
                dbActive:
                  true,
                onchainActive:
                  true,
                syncStatus:
                  'SYNCED',
              },
              wallet:
                OTHER_USER_WALLET,
            }),
            auction({
              status:
                'COLLECTION',
            }),
          ),
          'RESOURCE_NOT_ASSIGNED',
          'RESOURCE_FORBIDDEN',
        );
      },
    );
  },
);

describe(
  'confirmation and bidding policies',
  () => {
    it(
      'allows Consignor confirmation when all approvals are ready',
      () => {
        assertAllowed(
          canConfirmAuction(
            actor(),
            auction({
              status:
                'PENDING',
              guarantorApproved:
                true,
              notaryApproved:
                true,
              confirmationReady:
                true,
            }),
          ),
        );
      },
    );

    it(
      'requires Notary approval before confirmation',
      () => {
        assertDenied(
          canConfirmAuction(
            actor(),
            auction({
              status:
                'PENDING',
              guarantorApproved:
                true,
              notaryApproved:
                false,
              confirmationReady:
                false,
            }),
          ),
          'NOTARY_APPROVAL_REQUIRED',
          'AUCTION_STATE_CHANGED',
        );
      },
    );

    it(
      'requires confirmation material to be ready',
      () => {
        assertDenied(
          canConfirmAuction(
            actor(),
            auction({
              status:
                'PENDING',
              guarantorApproved:
                true,
              notaryApproved:
                true,
              confirmationReady:
                false,
            }),
          ),
          'CONFIRMATION_NOT_READY',
          'AUCTION_STATE_CHANGED',
        );
      },
    );

    it(
      'allows a verified non-Consignor to bid during SCHEDULED',
      () => {
        assertAllowed(
          canBidThroughApplication(
            actor({
              wallet:
                OTHER_USER_WALLET,
            }),
            auction({
              status:
                'SCHEDULED',
            }),
          ),
        );
      },
    );

    it(
      'allows a verified non-Consignor to bid during OPEN',
      () => {
        assertAllowed(
          canBidThroughApplication(
            actor({
              wallet:
                OTHER_USER_WALLET,
            }),
            auction({
              status:
                'OPEN',
            }),
          ),
        );
      },
    );

    it(
      'rejects the Consignor from bidding',
      () => {
        assertDenied(
          canBidThroughApplication(
            actor(),
            auction({
              status:
                'OPEN',
            }),
          ),
          'CONSIGNOR_CANNOT_BID',
          'RESOURCE_FORBIDDEN',
        );
      },
    );

    it(
      'rejects application bidding without verified KYC',
      () => {
        assertDenied(
          canBidThroughApplication(
            actor({
              wallet:
                OTHER_USER_WALLET,
              kycStatus:
                'FAILED',
            }),
            auction({
              status:
                'OPEN',
            }),
          ),
          'KYC_NOT_VERIFIED',
          'ROLE_FORBIDDEN',
        );
      },
    );

    it(
      'rejects bidding after close',
      () => {
        assertDenied(
          canBidThroughApplication(
            actor({
              wallet:
                OTHER_USER_WALLET,
            }),
            auction({
              status:
                'CLOSED',
            }),
          ),
          'INVALID_AUCTION_STATE',
          'AUCTION_STATE_CHANGED',
        );
      },
    );
  },
);

describe(
  'AWARDING and withdrawal policies',
  () => {
    it(
      'allows only the active candidate to sign during AWARDING',
      () => {
        assertAllowed(
          canSignAward(
            actor({
              wallet:
                WINNER_WALLET,
            }),
            auction({
              status:
                'AWARDING',
              activeCandidateWallet:
                WINNER_WALLET,
            }),
          ),
        );
      },
    );

    it(
      'rejects a wallet that is not the active candidate',
      () => {
        assertDenied(
          canSignAward(
            actor({
              wallet:
                OTHER_USER_WALLET,
            }),
            auction({
              status:
                'AWARDING',
              activeCandidateWallet:
                WINNER_WALLET,
            }),
          ),
          'NOT_ACTIVE_CANDIDATE',
          'RESOURCE_FORBIDDEN',
        );
      },
    );

    it(
      'rejects AwardSign outside AWARDING',
      () => {
        assertDenied(
          canSignAward(
            actor({
              wallet:
                WINNER_WALLET,
            }),
            auction({
              status:
                'COLLECTION',
              activeCandidateWallet:
                WINNER_WALLET,
            }),
          ),
          'INVALID_AUCTION_STATE',
          'AUCTION_STATE_CHANGED',
        );
      },
    );

    it(
      'allows an eligible bidder refund',
      () => {
        const result =
          canWithdrawRefund(
            actor({
              wallet:
                OTHER_USER_WALLET,
            }),
            auction({
              status:
                'CLAIM_PERIOD',
              winnerWallet:
                WINNER_WALLET,
            }),
            {
              now:
                CLOSE_AT + 1n,
              closeAt:
                CLOSE_AT,
              winner:
                WINNER_WALLET,
              myBid:
                1_000_000n,
              withdrawn:
                false,
              rank:
                2,
              defaulted:
                false,
              passedIn:
                false,
            },
          );

        assert.equal(
          result.allowed,
          true,
        );

        assert.equal(
          result.refund.eligible,
          true,
        );
      },
    );

    it(
      'rejects a refund before eligibility',
      () => {
        const result =
          canWithdrawRefund(
            actor({
              wallet:
                OTHER_USER_WALLET,
            }),
            auction({
              status:
                'AWARDING',
            }),
            {
              now:
                CLOSE_AT + 1n,
              closeAt:
                CLOSE_AT,
              winner:
                null,
              myBid:
                1_000_000n,
              withdrawn:
                false,
              rank:
                2,
              defaulted:
                false,
              passedIn:
                false,
            },
          );

        assertDenied(
          result,
          'REFUND_NOT_AVAILABLE',
          'AUCTION_STATE_CHANGED',
        );

        assert.equal(
          result.refund.eligible,
          false,
        );
      },
    );

    it(
      'rejects winner refund even when refund input is inconsistent',
      () => {
        const result =
          canWithdrawRefund(
            actor({
              wallet:
                WINNER_WALLET,
            }),
            auction({
              status:
                'CLAIM_PERIOD',
              winnerWallet:
                WINNER_WALLET,
            }),
            {
              now:
                CLOSE_AT + 1n,
              closeAt:
                CLOSE_AT,
              winner:
                OTHER_USER_WALLET,
              myBid:
                1_000_000n,
              withdrawn:
                false,
              rank:
                1,
              defaulted:
                false,
              passedIn:
                false,
            },
          );

        assertDenied(
          result,
          'WINNER_MISMATCH',
          'RESOURCE_FORBIDDEN',
        );
      },
    );

    it(
      'allows the Consignor to withdraw proceeds in CLAIM_PERIOD',
      () => {
        assertAllowed(
          canWithdrawConsignor(
            actor(),
            auction({
              status:
                'CLAIM_PERIOD',
            }),
          ),
        );
      },
    );

    it(
      'rejects Consignor withdrawal outside CLAIM_PERIOD',
      () => {
        assertDenied(
          canWithdrawConsignor(
            actor(),
            auction({
              status:
                'COLLECTION',
            }),
          ),
          'INVALID_AUCTION_STATE',
          'AUCTION_STATE_CHANGED',
        );
      },
    );

    it(
      'allows the Consignor to reuse a PASSED_IN auction',
      () => {
        assertAllowed(
          canReuseRound(
            actor(),
            auction({
              status:
                'PASSED_IN',
            }),
          ),
        );
      },
    );

    it(
      'rejects reuse outside PASSED_IN',
      () => {
        assertDenied(
          canReuseRound(
            actor(),
            auction({
              status:
                'SETTLED',
            }),
          ),
          'INVALID_AUCTION_STATE',
          'AUCTION_STATE_CHANGED',
        );
      },
    );
  },
);

describe(
  'administrative policies',
  () => {
    it(
      'allows User Admin to review KYC',
      () => {
        assertAllowed(
          canReviewKyc(
            userAdminActor(),
          ),
        );
      },
    );

    it(
      'rejects ordinary user from reviewing KYC',
      () => {
        assertDenied(
          canReviewKyc(
            actor(),
          ),
          'USER_ADMIN_ROLE_REQUIRED',
          'ROLE_FORBIDDEN',
        );
      },
    );

    it(
      'allows Platform Admin to manage partners',
      () => {
        assertAllowed(
          canManagePartners(
            platformAdminActor(),
          ),
        );
      },
    );

    it(
      'allows Platform Admin to manage User Admin registry',
      () => {
        assertAllowed(
          canManageUserAdmins(
            platformAdminActor(),
          ),
        );
      },
    );

    it(
      'does not give Platform Admin authority to an ordinary user',
      () => {
        assertDenied(
          canManagePartners(
            actor(),
          ),
          'OWNER_ROLE_REQUIRED',
          'ROLE_FORBIDDEN',
        );

        assertDenied(
          canManageUserAdmins(
            actor(),
          ),
          'OWNER_ROLE_REQUIRED',
          'ROLE_FORBIDDEN',
        );
      },
    );
  },
);

describe(
  'authorization assertion',
  () => {
    it(
      'accepts an allowed decision',
      () => {
        assert.doesNotThrow(
          () =>
            assertAuthorized(
              canCreateAuction(
                actor(),
              ),
            ),
        );
      },
    );

    it(
      'throws the policy error code for a denied decision',
      () => {
        expectDomainError(
          () =>
            assertAuthorized(
              canCreateAuction(
                actor({
                  authenticated:
                    false,
                }),
              ),
            ),
          'UNAUTHENTICATED',
        );
      },
    );

    it(
      'supports a custom denial message',
      () => {
        assert.throws(
          () =>
            assertAuthorized(
              canManagePartners(
                actor(),
              ),
              'Only the contract owner may manage partners.',
            ),
          (
            error: unknown,
          ) => {
            assert.equal(
              error instanceof DomainError,
              true,
            );

            if (
              !(error instanceof DomainError)
            ) {
              return false;
            }

            assert.equal(
              error.code,
              'ROLE_FORBIDDEN',
            );

            assert.equal(
              error.message,
              'Only the contract owner may manage partners.',
            );

            return true;
          },
        );
      },
    );
  },
);
