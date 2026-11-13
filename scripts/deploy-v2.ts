import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import solc from 'solc';
import {
  createPublicClient,
  createWalletClient,
  encodeDeployData,
  http,
  isAddress,
  keccak256,
  type Abi,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia } from 'viem/chains';

import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  GUARANTOR_COMPATIBILITY_CATEGORY,
  ParalelAuctionAbi,
  getParalelUsdcAddress,
} from '../packages/contracts/src/index';

const DEPLOY_CONFIRMATION = 'DEPLOY_V2_TO_ARBITRUM_SEPOLIA';
const MAX_RUNTIME_BYTECODE_BYTES = 24_576;

function requireEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function requireAddress(name: string): Address {
  const value = requireEnvironment(name);
  if (!isAddress(value)) {
    throw new Error(`${name} must be a valid EVM address.`);
  }
  return value.toLowerCase() as Address;
}

function requireAddressList(name: string, optional = false): Address[] {
  const entries = (process.env[name] ?? '')
    .split(',')
    .map((wallet) => wallet.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
  if (!optional && entries.length === 0) {
    throw new Error(`${name} must contain at least one EVM address.`);
  }
  return entries.map((wallet) => {
    if (!isAddress(wallet)) {
      throw new Error(`${name} contains an invalid EVM address.`);
    }
    return wallet.toLowerCase() as Address;
  });
}

function privateKeyValue(name: string): Hex {
  const value = requireEnvironment(name);
  const normalized = value.startsWith('0x') ? value : `0x${value}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error(`${name} must be a 32-byte hexadecimal private key.`);
  }
  return normalized as Hex;
}

async function compileContract(): Promise<{
  abi: Abi;
  bytecode: Hex;
  runtimeBytecodeBytes: number;
}> {
  const contractPath = resolve('contracts/src/ParalelAuction.sol');
  const interfacePath = resolve('contracts/src/interfaces/IERC20Permit.sol');
  const [contractSource, interfaceSource] = await Promise.all([
    readFile(contractPath, 'utf8'),
    readFile(interfacePath, 'utf8'),
  ]);
  const input = {
    language: 'Solidity',
    sources: {
      'contracts/src/ParalelAuction.sol': { content: contractSource },
      'contracts/src/interfaces/IERC20Permit.sol': { content: interfaceSource },
    },
    settings: {
      optimizer: { enabled: true, runs: 1 },
      viaIR: true,
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'],
        },
      },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input))) as {
    errors?: readonly { severity: string; formattedMessage: string }[];
    contracts?: Record<string, Record<string, {
      abi: readonly unknown[];
      evm: {
        bytecode: { object: string };
        deployedBytecode: { object: string };
      };
    }>>;
  };
  const errors = output.errors?.filter((item) => item.severity === 'error') ?? [];
  if (errors.length > 0) {
    throw new Error(errors.map((item) => item.formattedMessage).join('\n'));
  }
  const artifact =
    output.contracts?.['contracts/src/ParalelAuction.sol']?.ParalelAuction;
  if (!artifact?.evm.bytecode.object || !artifact.evm.deployedBytecode.object) {
    throw new Error('Solidity compiler did not produce deployment bytecode.');
  }

  const runtimeBytecodeBytes = artifact.evm.deployedBytecode.object.length / 2;
  if (runtimeBytecodeBytes > MAX_RUNTIME_BYTECODE_BYTES) {
    throw new Error(
      `Runtime bytecode is ${runtimeBytecodeBytes} bytes, above the EVM limit.`,
    );
  }

  return {
    abi: artifact.abi as Abi,
    bytecode: `0x${artifact.evm.bytecode.object}` as Hex,
    runtimeBytecodeBytes,
  };
}

async function main(): Promise<void> {
  const rpcUrl = requireEnvironment('ARBITRUM_RPC_URL');
  const parsedRpcUrl = new URL(rpcUrl);
  if (parsedRpcUrl.protocol !== 'https:' && parsedRpcUrl.protocol !== 'http:') {
    throw new Error('ARBITRUM_RPC_URL must use HTTP or HTTPS.');
  }

  const ownerPrivateKey = privateKeyValue('OWNER_PRIVATE_KEY');
  const relayerPrivateKey = privateKeyValue('RELAYER_PRIVATE_KEY');
  const ownerWallet = requireAddress('OWNER_PLATFORM_WALLET');
  const usdcAddress = requireAddress('USDC_ADDRESS');
  const taxWallet = requireAddress('TAX_WALLET');
  const relayerWallet = requireAddress('RELAYER_WALLET');
  const notaryWallets = requireAddressList('NOTARY_WALLET');
  const guarantorWallets = requireAddressList('GUARANTOR_WALLET');
  const adminWallets = [
    ...new Set(requireAddressList('USER_ADMIN_WALLET', true)),
  ];
  const partnerWallets = [...notaryWallets, ...guarantorWallets];
  if (new Set(partnerWallets).size !== partnerWallets.length) {
    throw new Error('NOTARY_WALLET and GUARANTOR_WALLET must contain distinct addresses.');
  }

  const ownerAccount = privateKeyToAccount(ownerPrivateKey);
  if (ownerAccount.address.toLowerCase() !== ownerWallet) {
    throw new Error('OWNER_PRIVATE_KEY does not match OWNER_PLATFORM_WALLET.');
  }
  if (
    privateKeyToAccount(relayerPrivateKey).address.toLowerCase() !==
    relayerWallet
  ) {
    throw new Error('RELAYER_PRIVATE_KEY does not match RELAYER_WALLET.');
  }
  if (
    arbitrumSepolia.id !== ARBITRUM_SEPOLIA_CHAIN_ID ||
    usdcAddress !== getParalelUsdcAddress(ARBITRUM_SEPOLIA_CHAIN_ID).toLowerCase()
  ) {
    throw new Error('Deployment configuration does not match Arbitrum Sepolia USDC.');
  }

  const compiled = await compileContract();
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

  const deploymentData = encodeDeployData({
    abi: compiled.abi,
    bytecode: compiled.bytecode,
    args: [usdcAddress, ownerWallet, taxWallet, relayerWallet],
  });
  const estimatedGas = await publicClient.estimateGas({
    account: ownerAccount.address,
    data: deploymentData,
  });
  const [balance, gasPrice] = await Promise.all([
    publicClient.getBalance({ address: ownerAccount.address }),
    publicClient.getGasPrice(),
  ]);
  if (balance < estimatedGas * gasPrice * 2n) {
    throw new Error('OWNER_PLATFORM_WALLET has insufficient Arbitrum Sepolia ETH for deployment.');
  }

  if (process.argv.includes('--dry-run')) {
    console.log(JSON.stringify({
      chainId,
      runtimeBytecodeBytes: compiled.runtimeBytecodeBytes,
      estimatedGas: estimatedGas.toString(),
      ownerBalanceWei: balance.toString(),
      dryRun: true,
    }, null, 2));
    return;
  }
  if (process.env.PARALEL_DEPLOY_TESTNET !== DEPLOY_CONFIRMATION) {
    throw new Error(
      'Set PARALEL_DEPLOY_TESTNET to DEPLOY_V2_TO_ARBITRUM_SEPOLIA to broadcast deployment transactions.',
    );
  }

  const deploymentHash = await walletClient.deployContract({
    abi: compiled.abi,
    bytecode: compiled.bytecode,
    args: [usdcAddress, ownerWallet, taxWallet, relayerWallet],
    account: ownerAccount,
    chain: arbitrumSepolia,
  });
  const deploymentReceipt =
    await publicClient.waitForTransactionReceipt({
      hash: deploymentHash,
      confirmations: 1,
      timeout: 180_000,
    });
  if (deploymentReceipt.status !== 'success' || !deploymentReceipt.contractAddress) {
    throw new Error(`Contract deployment failed: ${deploymentHash}`);
  }

  const contractAddress = deploymentReceipt.contractAddress;
  const runtimeCode = await publicClient.getCode({ address: contractAddress });
  if (!runtimeCode || runtimeCode === '0x') {
    throw new Error('Deployed contract has no runtime bytecode.');
  }
  const runtimeBytecodeHash = keccak256(runtimeCode);

  const setupTransactions: string[] = [];
  const waitForSetupTransaction = async (hash: Hex): Promise<void> => {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      confirmations: 1,
      timeout: 180_000,
    });
    if (receipt.status !== 'success') {
      throw new Error(`Contract setup transaction failed: ${hash}`);
    }
    setupTransactions.push(hash);
  };

  await waitForSetupTransaction(await walletClient.writeContract({
    address: contractAddress,
    abi: ParalelAuctionAbi,
    functionName: 'setFeeConfig',
    args: [{
      platformBps: 250,
      guarantorBps: 150,
      notaryBps: 100,
      taxBps: 1_000,
      defaultFeeBps: 500,
      withdrawalFee: 2_500_000n,
    }],
    account: ownerAccount,
    chain: arbitrumSepolia,
  }));
  for (const notaryWallet of notaryWallets) {
    await waitForSetupTransaction(await walletClient.writeContract({
      address: contractAddress,
      abi: ParalelAuctionAbi,
      functionName: 'setPartner',
      args: [notaryWallet, 0, 0, true],
      account: ownerAccount,
      chain: arbitrumSepolia,
    }));
  }
  for (const guarantorWallet of guarantorWallets) {
    await waitForSetupTransaction(await walletClient.writeContract({
      address: contractAddress,
      abi: ParalelAuctionAbi,
      functionName: 'setPartner',
      args: [guarantorWallet, 1, GUARANTOR_COMPATIBILITY_CATEGORY, true],
      account: ownerAccount,
      chain: arbitrumSepolia,
    }));
  }
  for (const adminWallet of adminWallets) {
    await waitForSetupTransaction(await walletClient.writeContract({
      address: contractAddress,
      abi: ParalelAuctionAbi,
      functionName: 'setUserAdmin',
      args: [adminWallet, true],
      account: ownerAccount,
      chain: arbitrumSepolia,
    }));
  }

  const configuredOwner = await publicClient.readContract({
    address: contractAddress,
    abi: ParalelAuctionAbi,
    functionName: 'owner',
  }) as Address;
  if (configuredOwner.toLowerCase() !== ownerWallet) {
    throw new Error('Deployed contract owner verification failed.');
  }

  console.log(JSON.stringify({
    chainId,
    contractAddress,
    deploymentBlock: deploymentReceipt.blockNumber.toString(),
    deploymentTransaction: deploymentHash,
    runtimeBytecodeHash,
    runtimeBytecodeBytes: compiled.runtimeBytecodeBytes,
    setupTransactions,
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
