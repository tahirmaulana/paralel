// @file packages/shared/relay/register.ts
import type { Hex, PublicClient, WalletClient } from 'viem';
import { relayAbi } from './abi';
import type { RegisterAuctionInput } from './types';

export async function submitRegisterAuction(
  publicClient: PublicClient,
  walletClient: WalletClient,
  contractAddress: `0x${string}`,
  input: RegisterAuctionInput,
): Promise<Hex> {
  const { request } = await publicClient.simulateContract({
    account: walletClient.account!,
    address: contractAddress,
    abi: relayAbi,
    functionName: 'registerAuction',
    args: [
      {
        auctionKey: input.auctionKey,
        consignor: input.consignor,
        guarantor: input.guarantor,
        notary: input.notary,
        category: input.category,
        specHash: input.specHash,
        startingBid: input.startingBid,
        bidIncrement: input.bidIncrement,
        openAt: input.openAt,
        durationHours: input.durationHours,
        platformBps: input.platformBps,
        guarantorBps: input.guarantorBps,
        notaryBps: input.notaryBps,
        taxBps: input.taxBps,
        confirmationCodeHash: input.confirmationCodeHash,
        notarySig: input.notarySig,
        consignorSig: input.consignorSig,
        notaryNonce: input.notaryNonce,
        notaryExpiry: input.notaryExpiry,
        consignorNonce: input.consignorNonce,
        consignorExpiry: input.consignorExpiry,
      },
    ],
  });

  return walletClient.writeContract(request);
}