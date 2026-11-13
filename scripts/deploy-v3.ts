import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import solc from 'solc';
import {
  createPublicClient,
  createWalletClient,
  http,
  isAddress,
  keccak256,
  toBytes,
  type Abi,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  GUARANTOR_COMPATIBILITY_CATEGORY,
  ParalelAuctionV3Abi,
  ParalelAuctionV3PolicyAbi,
  getParalelUsdcAddress,
} from '../packages/contracts/src/index';

const DEPLOY_CONFIRMATION = 'DEPLOY_V3_TO_ARBITRUM_SEPOLIA';
const MAX_RUNTIME_BYTECODE_BYTES = 24_576;

const sources = [
  'contracts/src/ParalelAuctionV3.sol',
  'contracts/src/ParalelAuctionV3Storage.sol',
  'contracts/src/ParalelAuctionV3PolicyLib.sol',
  'contracts/src/ParalelAuctionV3PolicyRegistry.sol',
  'contracts/src/ParalelAuctionV3AdminFacet.sol',
  'contracts/src/ParalelAuctionV3RegistrationFacet.sol',
  'contracts/src/ParalelAuctionV3BiddingFacet.sol',
  'contracts/src/ParalelAuctionV3SettlementFacet.sol',
  'contracts/src/ParalelAuctionV3ReadFacet.sol',
  'contracts/src/interfaces/IERC20Permit.sol',
] as const;

const facetNames = [
  'ParalelAuctionV3AdminFacet',
  'ParalelAuctionV3RegistrationFacet',
  'ParalelAuctionV3BiddingFacet',
  'ParalelAuctionV3SettlementFacet',
  'ParalelAuctionV3ReadFacet',
] as const;

type LinkReference = {
  length: number;
  start: number;
};

type Artifact = {
  abi: Abi;
  evm: {
    bytecode: {
      object: string;
      linkReferences: Record<string, Record<string, LinkReference[]>>;
    };
    deployedBytecode: { object: string };
  };
};

type AbiParameter = {
  type: string;
  components?: readonly AbiParameter[];
};

type FunctionAbiItem = Extract<Abi[number], { type: 'function' }>;

function requireEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function requireAddress(name: string): Address {
  const value = requireEnvironment(name);
  if (!isAddress(value)) throw new Error(`${name} must be a valid EVM address.`);
  return value.toLowerCase() as Address;
}

function requireAddressList(name: string, optional = false): Address[] {
  const entries = (process.env[name] ?? '')
    .split(',')
    .map((entry) => entry.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
  if (!optional && entries.length === 0) {
    throw new Error(`${name} must contain at least one EVM address.`);
  }
  return entries.map((entry) => {
    if (!isAddress(entry)) throw new Error(`${name} contains an invalid EVM address.`);
    return entry.toLowerCase() as Address;
  });
}

function requirePrivateKey(name: string): Hex {
  const value = requireEnvironment(name);
  const normalized = value.startsWith('0x') ? value : `0x${value}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error(`${name} must be a 32-byte hexadecimal private key.`);
  }
  return normalized as Hex;
}

async function compileContracts(): Promise<Map<string, Artifact>> {
  const sourceContent: Record<string, { content: string }> = {};
  for (const path of sources) {
    sourceContent[path] = { content: await readFile(resolve(path), 'utf8') };
  }
  const output = JSON.parse(solc.compile(JSON.stringify({
    language: 'Solidity',
    sources: sourceContent,
    settings: {
      optimizer: { enabled: true, runs: 1 },
      viaIR: true,
      outputSelection: {
        '*': { '*': ['abi', 'evm.bytecode.object', 'evm.bytecode.linkReferences', 'evm.deployedBytecode.object'] },
      },
    },
  }))) as {
    errors?: readonly { severity: string; formattedMessage: string }[];
    contracts?: Record<string, Record<string, Artifact>>;
  };
  const errors = output.errors?.filter((item) => item.severity === 'error') ?? [];
  if (errors.length > 0) {
    throw new Error(errors.map((item) => item.formattedMessage).join('\n'));
  }

  const contracts = new Map<string, Artifact>();
  for (const source of Object.values(output.contracts ?? {})) {
    for (const [name, artifact] of Object.entries(source)) {
      if (!name.startsWith('ParalelAuctionV3')) continue;
      const runtimeBytes = artifact.evm.deployedBytecode.object.length / 2;
      if (runtimeBytes > MAX_RUNTIME_BYTECODE_BYTES) {
        throw new Error(`${name} runtime bytecode is ${runtimeBytes} bytes, above the EVM limit.`);
      }
      contracts.set(name, artifact);
    }
  }
  return contracts;
}

function linkBytecode(
  artifact: Artifact,
  deployedLibraries: ReadonlyMap<string, Address>,
): Hex {
  let bytecode = artifact.evm.bytecode.object;
  for (const libraries of Object.values(artifact.evm.bytecode.linkReferences)) {
    for (const [libraryName, references] of Object.entries(libraries)) {
      const libraryAddress = deployedLibraries.get(libraryName);
      if (!libraryAddress) throw new Error(`No deployment address for linked library ${libraryName}.`);
      const replacement = libraryAddress.slice(2).toLowerCase();
      for (const reference of references) {
        const start = reference.start * 2;
        const end = start + reference.length * 2;
        bytecode = `${bytecode.slice(0, start)}${replacement}${bytecode.slice(end)}`;
      }
    }
  }
  if (!/^[0-9a-fA-F]*$/.test(bytecode)) {
    throw new Error('Solidity bytecode still contains unresolved library references.');
  }
  return `0x${bytecode}` as Hex;
}

function canonicalType(parameter: AbiParameter): string {
  if (!parameter.type.startsWith('tuple')) return parameter.type;
  const suffix = parameter.type.slice('tuple'.length);
  return `(${(parameter.components ?? []).map(canonicalType).join(',')})${suffix}`;
}

function getSelector(item: FunctionAbiItem): Hex {
  const signature = `${item.name}(${item.inputs.map(canonicalType).join(',')})`;
  return keccak256(toBytes(signature)).slice(0, 10) as Hex;
}

function getFacetSelectors(abi: Abi): Hex[] {
  return abi
    .filter((item): item is FunctionAbiItem => item.type === 'function')
    .map(getSelector);
}

function artifactFor(contracts: ReadonlyMap<string, Artifact>, name: string): Artifact {
  const artifact = contracts.get(name);
  if (!artifact) throw new Error(`Missing compiled contract artifact: ${name}.`);
  return artifact;
}

async function main(): Promise<void> {
  const contracts = await compileContracts();
  const allNames = [
    'ParalelAuctionV3PolicyLib',
    'ParalelAuctionV3PolicyRegistry',
    ...facetNames,
    'ParalelAuctionV3',
  ];
  const runtimeBytecodeBytes = Object.fromEntries(
    allNames.map((name) => [
      name,
      artifactFor(contracts, name).evm.deployedBytecode.object.length / 2,
    ]),
  );
  const selectorsByFacet = facetNames.map((name) =>
    getFacetSelectors(artifactFor(contracts, name).abi)
  );
  const selectorSet = new Set(
    selectorsByFacet.flat().map((selector) => selector.toLowerCase()),
  );
  if (selectorSet.size !== selectorsByFacet.flat().length) {
    throw new Error('Facet selector collision detected; proxy deployment stopped.');
  }
  const missingSelectors = ParalelAuctionV3Abi
    .filter((item) => item.type === 'function')
    .filter((item) => item.name !== 'facetForSelector')
    .map(getSelector)
    .filter((selector) => !selectorSet.has(selector.toLowerCase()));
  if (missingSelectors.length > 0) {
    throw new Error(`Facet routing is missing ABI selectors: ${missingSelectors.join(', ')}`);
  }

  if (process.argv.includes('--dry-run')) {
    console.log(JSON.stringify({ chainId: ARBITRUM_SEPOLIA_CHAIN_ID, runtimeBytecodeBytes, dryRun: true }, null, 2));
    return;
  }

  const rpcUrl = requireEnvironment('ARBITRUM_RPC_URL');
  if (!['https:', 'http:'].includes(new URL(rpcUrl).protocol)) {
    throw new Error('ARBITRUM_RPC_URL must use HTTP or HTTPS.');
  }
  const ownerPrivateKey = requirePrivateKey('OWNER_PRIVATE_KEY');
  const relayerPrivateKey = requirePrivateKey('RELAYER_PRIVATE_KEY');
  const ownerWallet = requireAddress('OWNER_PLATFORM_WALLET');
  const relayerWallet = requireAddress('RELAYER_WALLET');
  const usdcAddress = requireAddress('USDC_ADDRESS');
  const taxWallet = requireAddress('TAX_WALLET');
  const notaryWallets = requireAddressList('NOTARY_WALLET');
  const guarantorWallets = requireAddressList('GUARANTOR_WALLET');
  const adminWallets = [...new Set(requireAddressList('BOOTSTRAP_USER_ADMIN_WALLETS', true))];
  const partnerWallets = [...notaryWallets, ...guarantorWallets];
  const partnerWalletSet = new Set(partnerWallets);
  if (new Set(partnerWallets).size !== partnerWallets.length) {
    throw new Error('NOTARY_WALLET and GUARANTOR_WALLET must contain distinct addresses.');
  }
  if (adminWallets.some((wallet) => partnerWalletSet.has(wallet))) {
    throw new Error('BOOTSTRAP_USER_ADMIN_WALLETS must not overlap partner wallets.');
  }

  const ownerAccount = privateKeyToAccount(ownerPrivateKey);
  if (ownerAccount.address.toLowerCase() !== ownerWallet) {
    throw new Error('OWNER_PRIVATE_KEY does not match OWNER_PLATFORM_WALLET.');
  }
  if (privateKeyToAccount(relayerPrivateKey).address.toLowerCase() !== relayerWallet) {
    throw new Error('RELAYER_PRIVATE_KEY does not match RELAYER_WALLET.');
  }
  if (
    arbitrumSepolia.id !== ARBITRUM_SEPOLIA_CHAIN_ID
      || usdcAddress !== getParalelUsdcAddress(ARBITRUM_SEPOLIA_CHAIN_ID).toLowerCase()
  ) {
    throw new Error('Deployment configuration does not match Arbitrum Sepolia USDC.');
  }
  if (process.env.PARALEL_DEPLOY_TESTNET !== DEPLOY_CONFIRMATION) {
    throw new Error(`Set PARALEL_DEPLOY_TESTNET to ${DEPLOY_CONFIRMATION} to broadcast.`);
  }

  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    account: ownerAccount,
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
  });
  const chainId = await publicClient.getChainId();
  if (chainId !== ARBITRUM_SEPOLIA_CHAIN_ID) {
    throw new Error(`RPC chain ID ${chainId} is not Arbitrum Sepolia.`);
  }

  if (process.argv.includes('--resume')) {
    const proxyAddress = requireAddress('PARALEL_V3_RESUME_PROXY_ADDRESS');
    const policyRegistryAddress = await publicClient.readContract({
      address: proxyAddress,
      abi: ParalelAuctionV3Abi,
      functionName: 'policyRegistryAddress',
    });
    const proxyCode = await publicClient.getCode({ address: proxyAddress });
    const registryCode = await publicClient.getCode({ address: policyRegistryAddress });
    if (!proxyCode || proxyCode === '0x' || !registryCode || registryCode === '0x') {
      throw new Error('Resume addresses do not contain deployed V3 contract code.');
    }

    const [
      deployedOwner,
      deployedCurrency,
      deployedRelayer,
      deployedPlatform,
      deployedTaxWallet,
      registryAuction,
      registryOwner,
      registryCurrency,
    ] = await Promise.all([
      publicClient.readContract({
        address: proxyAddress,
        abi: ParalelAuctionV3Abi,
        functionName: 'owner',
      }),
      publicClient.readContract({
        address: proxyAddress,
        abi: ParalelAuctionV3Abi,
        functionName: 'defaultCurrency',
      }),
      publicClient.readContract({
        address: proxyAddress,
        abi: ParalelAuctionV3Abi,
        functionName: 'relayerWallet',
      }),
      publicClient.readContract({
        address: proxyAddress,
        abi: ParalelAuctionV3Abi,
        functionName: 'platformWallet',
      }),
      publicClient.readContract({
        address: proxyAddress,
        abi: ParalelAuctionV3Abi,
        functionName: 'taxWallet',
      }),
      publicClient.readContract({
        address: policyRegistryAddress,
        abi: ParalelAuctionV3PolicyAbi,
        functionName: 'auctionContract',
      }),
      publicClient.readContract({
        address: policyRegistryAddress,
        abi: ParalelAuctionV3PolicyAbi,
        functionName: 'owner',
      }),
      publicClient.readContract({
        address: policyRegistryAddress,
        abi: ParalelAuctionV3PolicyAbi,
        functionName: 'defaultCurrency',
      }),
    ]);
    if (
      deployedOwner.toLowerCase() !== ownerWallet ||
      deployedCurrency.toLowerCase() !== usdcAddress ||
      deployedRelayer.toLowerCase() !== relayerWallet ||
      deployedPlatform.toLowerCase() !== ownerWallet ||
      deployedTaxWallet.toLowerCase() !== taxWallet ||
      registryAuction.toLowerCase() !== proxyAddress.toLowerCase() ||
      registryOwner.toLowerCase() !== ownerWallet ||
      registryCurrency.toLowerCase() !== usdcAddress
    ) {
      throw new Error('Existing V3 proxy, registry, wallet, owner, or currency verification failed.');
    }

    const facetAddresses = await Promise.all(
      selectorsByFacet.map(async (selectors) => {
        const addresses = await Promise.all(
          selectors.map((selector) => publicClient.readContract({
            address: proxyAddress,
            abi: ParalelAuctionV3Abi,
            functionName: 'facetForSelector',
            args: [selector],
          })),
        );
        const facetAddress = addresses[0];
        if (
          !facetAddress ||
          facetAddress === '0x0000000000000000000000000000000000000000' ||
          addresses.some((address) => address.toLowerCase() !== facetAddress.toLowerCase())
        ) {
          throw new Error('Existing V3 selector routing is incomplete or inconsistent.');
        }
        const facetCode = await publicClient.getCode({ address: facetAddress });
        if (!facetCode || facetCode === '0x') {
          throw new Error('A V3 selector is routed to an address without facet code.');
        }
        return facetAddress;
      }),
    );

    for (const [wallets, expectedType] of [
      [notaryWallets, 0],
      [guarantorWallets, 1],
    ] as const) {
      for (const wallet of wallets) {
        const partner = await publicClient.readContract({
          address: proxyAddress,
          abi: ParalelAuctionV3Abi,
          functionName: 'partners',
          args: [wallet],
        });
        if (!partner.active || Number(partner.pType) !== expectedType) {
          throw new Error('Existing V3 partner setup does not match the deployment configuration.');
        }
      }
    }

    const setupTransactions: Hex[] = [];
    for (const wallet of adminWallets) {
      const hash = await walletClient.writeContract({
        address: proxyAddress,
        chain: arbitrumSepolia,
        abi: ParalelAuctionV3Abi,
        functionName: 'setUserAdmin',
        args: [wallet, true],
      });
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
        timeout: 180_000,
      });
      if (receipt.status !== 'success') {
        throw new Error(`User-admin setup transaction failed: ${hash}`);
      }
      setupTransactions.push(hash);
    }

    const latestBlock = await publicClient.getBlockNumber();
    let cursor = latestBlock;
    let indexingStartBlock: bigint | null = null;
    while (cursor >= 0n && indexingStartBlock === null) {
      const fromBlock = cursor > 499n ? cursor - 499n : 0n;
      const logs = await publicClient.getContractEvents({
        address: proxyAddress,
        abi: ParalelAuctionV3Abi,
        eventName: 'PartnerUpdated',
        strict: true,
        fromBlock,
        toBlock: cursor,
      });
      if (logs.length > 0) {
        indexingStartBlock = logs.reduce(
          (first, log) => log.blockNumber < first ? log.blockNumber : first,
          logs[0]!.blockNumber,
        );
      } else if (fromBlock === 0n) {
        break;
      } else {
        cursor = fromBlock - 1n;
      }
    }
    if (indexingStartBlock === null) {
      throw new Error('Could not locate initial V3 partner setup events for indexer bootstrap.');
    }

    let deploymentBlock = indexingStartBlock;
    let deploymentTransaction: Hex | null = null;
    const creationSearchStart =
      indexingStartBlock > 100n
        ? indexingStartBlock - 100n
        : 0n;
    for (
      let blockNumber = creationSearchStart;
      blockNumber <= indexingStartBlock && deploymentTransaction === null;
      blockNumber++
    ) {
      const block = await publicClient.getBlock({
        blockNumber,
        includeTransactions: true,
      });
      for (const transaction of block.transactions) {
        if (
          typeof transaction === 'string' ||
          transaction.from.toLowerCase() !== ownerWallet
        ) {
          continue;
        }
        const receipt = await publicClient.getTransactionReceipt({
          hash: transaction.hash,
        });
        if (receipt.contractAddress?.toLowerCase() === proxyAddress.toLowerCase()) {
          deploymentBlock = receipt.blockNumber;
          deploymentTransaction = transaction.hash;
          break;
        }
      }
    }

    console.log(JSON.stringify({
      chainId,
      policyRegistryAddress,
      contractAddress: proxyAddress,
      deploymentBlock: deploymentBlock.toString(),
      deploymentTransaction,
      runtimeBytecodeHash: keccak256(proxyCode),
      runtimeBytecodeBytes: runtimeBytecodeBytes.ParalelAuctionV3,
      facetAddresses,
      resumed: true,
      setupTransactions,
    }, null, 2));
    return;
  }

  const deployed: Record<string, { address: Address; transactionHash: Hex; blockNumber: bigint }> = {};
  const deploy = async (name: string, args: readonly unknown[] = [], libraries = new Map<string, Address>()) => {
    const artifact = artifactFor(contracts, name);
    const hash = await walletClient.deployContract({
      chain: arbitrumSepolia,
      abi: artifact.abi,
      bytecode: linkBytecode(artifact, libraries),
      args,
    });
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
      timeout: 180_000,
    });
    if (receipt.status !== 'success' || !receipt.contractAddress) {
      throw new Error(`${name} deployment failed: ${hash}`);
    }
    deployed[name] = {
      address: receipt.contractAddress,
      transactionHash: hash,
      blockNumber: receipt.blockNumber,
    };
    return receipt.contractAddress;
  };

  const libraryAddress = await deploy('ParalelAuctionV3PolicyLib');
  const libraryAddresses = new Map<string, Address>([
    ['ParalelAuctionV3PolicyLib', libraryAddress],
  ]);
  const policyRegistryAddress = await deploy(
    'ParalelAuctionV3PolicyRegistry',
    [usdcAddress],
    libraryAddresses,
  );
  const facetAddresses: Address[] = [];
  for (const facetName of facetNames) {
    const facetAddress = await deploy(facetName);
    facetAddresses.push(facetAddress);
  }

  const proxyArtifact = artifactFor(contracts, 'ParalelAuctionV3');
  const proxyHash = await walletClient.deployContract({
    chain: arbitrumSepolia,
    abi: proxyArtifact.abi,
    bytecode: linkBytecode(proxyArtifact, new Map()),
    args: [
      usdcAddress,
      ownerWallet,
      taxWallet,
      relayerWallet,
      policyRegistryAddress,
      facetAddresses,
      selectorsByFacet,
    ],
  });
  const proxyReceipt = await publicClient.waitForTransactionReceipt({
    hash: proxyHash,
    confirmations: 1,
    timeout: 180_000,
  });
  if (proxyReceipt.status !== 'success' || !proxyReceipt.contractAddress) {
    throw new Error(`ParalelAuctionV3 proxy deployment failed: ${proxyHash}`);
  }
  const proxyAddress = proxyReceipt.contractAddress;
  deployed.ParalelAuctionV3 = {
    address: proxyAddress,
    transactionHash: proxyHash,
    blockNumber: proxyReceipt.blockNumber,
  };

  const registryArtifact = artifactFor(contracts, 'ParalelAuctionV3PolicyRegistry');
  const registryAbi = registryArtifact.abi;
  const waitForSetup = async (hash: Hex): Promise<void> => {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
      timeout: 180_000,
    });
    if (receipt.status !== 'success') throw new Error(`Setup transaction failed: ${hash}`);
    setupTransactions.push(hash);
  };
  const setupTransactions: Hex[] = [];
  await waitForSetup(await walletClient.writeContract({
    address: policyRegistryAddress,
    chain: arbitrumSepolia,
    abi: registryAbi,
    functionName: 'setAuctionContract',
    args: [proxyAddress],
  }));
  for (const wallet of notaryWallets) {
    await waitForSetup(await walletClient.writeContract({
      address: proxyAddress,
      chain: arbitrumSepolia,
      abi: ParalelAuctionV3Abi,
      functionName: 'setPartner',
      args: [wallet, 0, 0, true],
    }));
  }
  for (const wallet of guarantorWallets) {
    await waitForSetup(await walletClient.writeContract({
      address: proxyAddress,
      chain: arbitrumSepolia,
      abi: ParalelAuctionV3Abi,
      functionName: 'setPartner',
      args: [wallet, 1, GUARANTOR_COMPATIBILITY_CATEGORY, true],
    }));
  }
  for (const wallet of adminWallets) {
    await waitForSetup(await walletClient.writeContract({
      address: proxyAddress,
      chain: arbitrumSepolia,
      abi: ParalelAuctionV3Abi,
      functionName: 'setUserAdmin',
      args: [wallet, true],
    }));
  }

  const deployedOwner = await publicClient.readContract({
    address: proxyAddress,
    abi: ParalelAuctionV3Abi,
    functionName: 'owner',
  });
  const deployedCurrency = await publicClient.readContract({
    address: proxyAddress,
    abi: ParalelAuctionV3Abi,
    functionName: 'defaultCurrency',
  });
  if (deployedOwner.toLowerCase() !== ownerWallet || deployedCurrency.toLowerCase() !== usdcAddress) {
    throw new Error('On-chain owner or default-currency verification failed.');
  }

  const proxyCode = await publicClient.getCode({ address: proxyAddress });
  if (!proxyCode || proxyCode === '0x') throw new Error('Proxy has no runtime bytecode.');
  console.log(JSON.stringify({
    chainId,
    policyRegistryAddress,
    contractAddress: proxyAddress,
    deploymentBlock: proxyReceipt.blockNumber.toString(),
    deploymentTransaction: proxyHash,
    runtimeBytecodeHash: keccak256(proxyCode),
    runtimeBytecodeBytes: runtimeBytecodeBytes.ParalelAuctionV3,
    deployments: Object.fromEntries(
      Object.entries(deployed).map(([name, value]) => [
        name,
        { address: value.address, transactionHash: value.transactionHash, blockNumber: value.blockNumber.toString() },
      ]),
    ),
    setupTransactions,
  }, null, 2));
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const rpcUrl = process.env.ARBITRUM_RPC_URL?.trim();
  console.error(
    rpcUrl
      ? message.replace(rpcUrl, '[configured ARBITRUM_RPC_URL]')
      : message,
  );
  process.exitCode = 1;
});
