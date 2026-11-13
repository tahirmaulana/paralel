import type { Address } from 'viem';

import { ARBITRUM_SEPOLIA_CHAIN_ID } from './constants';

import {
  arbitrumSepoliaDeployment,
  type ParalelDeployment,
} from './deployments/arbitrum-sepolia';

const DEPLOYMENTS: Readonly<Record<number, ParalelDeployment>> = {
  [ARBITRUM_SEPOLIA_CHAIN_ID]: arbitrumSepoliaDeployment,
};

export type SupportedChainId = typeof ARBITRUM_SEPOLIA_CHAIN_ID;

export function isSupportedChainId(
  chainId: number,
): chainId is SupportedChainId {
  return Object.prototype.hasOwnProperty.call(
    DEPLOYMENTS,
    chainId,
  );
}

export function getParalelDeployment(
  chainId: number = ARBITRUM_SEPOLIA_CHAIN_ID,
): ParalelDeployment {
  const deployment = DEPLOYMENTS[chainId];

  if (!deployment) {
    throw new Error(
      `Unsupported PARALEL chain ID: ${chainId}`,
    );
  }

  return deployment;
}

export function getParalelContractAddress(
  chainId: number = ARBITRUM_SEPOLIA_CHAIN_ID,
): Address {
  return getParalelDeployment(chainId).contractAddress;
}

export function getParalelUsdcAddress(
  chainId: number = ARBITRUM_SEPOLIA_CHAIN_ID,
): Address {
  return getParalelDeployment(chainId).usdcAddress;
}

export function getParalelPolicyRegistryAddress(
  chainId: number = ARBITRUM_SEPOLIA_CHAIN_ID,
): Address | null {
  return getParalelDeployment(chainId).policyRegistryAddress ?? null;
}

export {
  arbitrumSepoliaDeployment,
  type ParalelDeployment,
};
