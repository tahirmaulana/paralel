import type {
  Address,
} from 'viem';

import {
  ContractPartnerType,
  readContractOwner,
  readPartnerState,
} from '@paralel/contracts';

import type {
  OnchainRoleReader,
  OnchainRoleState,
} from '@paralel/auth';

import {
  createDomainError,
} from '@paralel/domain';

import {
  getPublicClient,
} from '@/lib/contracts/public-client';

function mapPartnerType(
  pType: number,
): 'NOTARY' | 'GUARANTOR' {
  if (
    pType ===
    ContractPartnerType.NOTARY
  ) {
    return 'NOTARY';
  }

  if (
    pType ===
    ContractPartnerType.GUARANTOR
  ) {
    return 'GUARANTOR';
  }

  throw createDomainError(
    'PARTNER_REGISTRY_DRIFT',
    'On-chain partner type is unsupported.',
    {
      details: {
        pType,
      },
    },
  );
}

export class ContractRoleReader
implements OnchainRoleReader {
  async readRoleState(
    wallet: Address,
  ): Promise<OnchainRoleState> {
    try {
      const client =
        getPublicClient();

      const [
        owner,
        partner,
      ] = await Promise.all([
        readContractOwner(
          client,
        ),
        readPartnerState(
          client,
          wallet,
        ),
      ]);

      return Object.freeze({
        owner,
        partner:
          Object.freeze({
            type:
              mapPartnerType(
                partner.pType,
              ),
            category:
              partner.category,
            active:
              partner.active,
          }),
      });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error
      ) {
        throw error;
      }

      throw createDomainError(
        'RPC_UNAVAILABLE',
        'Contract role state could not be read.',
        {
          retryable:
            true,
          cause:
            error,
          details: {
            wallet,
          },
        },
      );
    }
  }
}

export const onchainRoleReader =
  new ContractRoleReader();
