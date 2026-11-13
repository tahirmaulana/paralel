import type { Address, Hex } from 'viem';

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
} from '../constants';

export type ParalelDeployment = {
  contractVersion: 'v2' | 'v3';
  chainId: typeof ARBITRUM_SEPOLIA_CHAIN_ID;
  chainName: 'Arbitrum Sepolia';
  contractAddress: Address;
  usdcAddress: Address;
  policyRegistryAddress?: Address;
  facetAddresses?: readonly Address[];

  /**
   * Initial block used by the current indexer.
   * Verify this against the deployment transaction before treating it as final.
   */
  deploymentBlock: bigint;

  /**
   * Populate only after retrieving the original deployment receipt.
   */
  deploymentTransaction: Hex | null;

  /**
   * keccak256 of the runtime bytecode returned by eth_getCode.
   * Populate using deployment verification, never manually guess it.
   */
  runtimeBytecodeHash: Hex | null;
};

export const arbitrumSepoliaDeployment = {
  contractVersion: 'v3',
  chainId: ARBITRUM_SEPOLIA_CHAIN_ID,
  chainName: 'Arbitrum Sepolia',

  contractAddress:
    '0xa0e47157cffb3385dc3bbed71174c8bb79028632',

  usdcAddress:
    '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',

  policyRegistryAddress:
    '0x39a405127ED988BFa4A1aF05e312C41413029508',

  facetAddresses: [
    '0x725A5C45a794bf798C2684f26d4D679efEaD248a',
    '0x3D3b560235634AAe734Bfe485A3a6a4eA3bDEF96',
    '0x1DD54062F1182Fa6C639e6632BAE219444B2B194',
    '0x448e2CfA2189A7C1075bE645Af43d40fcA4c1FFd',
    '0x9080Ab4691A5D336644F27a570a93265066B982C',
  ],

  deploymentBlock: 328_437_993n,

  deploymentTransaction:
    '0x8be6b50282e8826a55aef3290af99dc7936087d5c6edb2abe917f192b4674917',

  runtimeBytecodeHash:
    '0xb0fb3219080f1cf2a2a431b3bedab18d16af015c745905f4b6bc11c965f0d405',
} as const satisfies ParalelDeployment;
