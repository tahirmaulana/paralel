import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import solc from 'solc';
import type { Abi, AbiItem } from 'viem';

const sourcePaths = [
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

const contractNames = {
  proxy: 'ParalelAuctionV3',
  policy: 'ParalelAuctionV3PolicyRegistry',
  policyLibrary: 'ParalelAuctionV3PolicyLib',
  facets: [
    'ParalelAuctionV3AdminFacet',
    'ParalelAuctionV3RegistrationFacet',
    'ParalelAuctionV3BiddingFacet',
    'ParalelAuctionV3SettlementFacet',
    'ParalelAuctionV3ReadFacet',
  ],
} as const;

function abiKey(item: AbiItem): string {
  if (item.type === 'constructor' || item.type === 'fallback' || item.type === 'receive') {
    return item.type;
  }
  const inputs = 'inputs' in item
    ? item.inputs.map((input) => {
        const tupleType = input.type.startsWith('tuple')
        ? `(${('components' in input ? input.components : undefined)?.map((component) => component.type).join(',') ?? ''})`
          : input.type;
        return `${tupleType}${input.type.startsWith('tuple') ? input.type.slice(5) : ''}`;
      }).join(',')
    : '';
  return `${item.type}:${item.name ?? ''}(${inputs})`;
}

function deduplicate(items: readonly AbiItem[]): AbiItem[] {
  const unique = new Map<string, AbiItem>();
  for (const item of items) {
    unique.set(abiKey(item), item);
  }
  return [...unique.values()];
}

async function main(): Promise<void> {
  const sources: Record<string, { content: string }> = {};
  for (const path of sourcePaths) {
    sources[path] = { content: await readFile(resolve(path), 'utf8') };
  }

  const output = JSON.parse(solc.compile(JSON.stringify({
    language: 'Solidity',
    sources,
    settings: {
      optimizer: { enabled: true, runs: 1 },
      viaIR: true,
      outputSelection: {
        '*': { '*': ['abi'] },
      },
    },
  }))) as {
    errors?: readonly { severity: string; formattedMessage: string }[];
    contracts?: Record<string, Record<string, { abi: readonly AbiItem[] }>>;
  };
  const errors = output.errors?.filter((item) => item.severity === 'error') ?? [];
  if (errors.length > 0) {
    throw new Error(errors.map((item) => item.formattedMessage).join('\n'));
  }

  const abiFor = (sourcePath: string, name: string): readonly AbiItem[] => {
    const artifact = output.contracts?.[sourcePath]?.[name];
    if (!artifact) throw new Error(`Missing ABI for ${name}.`);
    return artifact.abi;
  };
  const proxyAbi = output.contracts?.['contracts/src/ParalelAuctionV3.sol']?.[
    contractNames.proxy
  ]?.abi;
  const policyAbi = output.contracts?.['contracts/src/ParalelAuctionV3PolicyRegistry.sol']?.[
    contractNames.policy
  ]?.abi;
  const policyLibraryAbi = output.contracts?.[
    'contracts/src/ParalelAuctionV3PolicyLib.sol'
  ]?.[contractNames.policyLibrary]?.abi;
  if (!proxyAbi || !policyAbi || !policyLibraryAbi) {
    throw new Error('Solidity compiler did not produce the V3 ABI set.');
  }

  const facetAbis = contractNames.facets.map((name) =>
    abiFor(`contracts/src/${name}.sol`, name)
  );
  const auctionAbi = deduplicate([
    ...proxyAbi.filter((item) => item.type === 'function'),
    ...facetAbis.flatMap((abi) => abi.filter((item) => item.type === 'function' || item.type === 'event' || item.type === 'error')),
  ]);
  const registryAbi = deduplicate([
    ...policyAbi,
    ...policyLibraryAbi.filter((item) => item.type === 'event' || item.type === 'error'),
  ]);

  const outputText = [
    "import type { Abi } from 'viem';",
    '',
    `export const ParalelAuctionV3Abi = ${JSON.stringify(auctionAbi, null, 2)} as const satisfies Abi;`,
    '',
    `export const ParalelAuctionV3PolicyAbi = ${JSON.stringify(registryAbi, null, 2)} as const satisfies Abi;`,
    '',
  ].join('\n');
  await writeFile(
    resolve('packages/contracts/src/abi-v3.ts'),
    outputText,
    'utf8',
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
