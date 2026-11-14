import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  GUARANTOR_APPROVAL_TYPES,
  GUARANTOR_REJECTION_TYPES,
  computeAuctionKey,
  computeReasonHash,
  getParalelContractAddress,
  getParalelEip712Domain,
} from "@paralel/contracts";
import {
  DomainError,
} from "@paralel/domain";
import {
  verifyTypedData,
  type Address,
  type Hex,
} from "viem";

export interface ApprovalSignatureInput {
  guarantorWallet: Address;
  auctionCode: string;
  specHash: Hex;
  nonce: bigint;
  expiry: bigint;
  signature: Hex;
}

export interface RejectionSignatureInput {
  guarantorWallet: Address;
  auctionCode: string;
  reason: string;
  nonce: bigint;
  expiry: bigint;
  signature: Hex;
}

const verifyingContract =
  getParalelContractAddress(
    ARBITRUM_SEPOLIA_CHAIN_ID,
  );

const domain =
  getParalelEip712Domain(
    ARBITRUM_SEPOLIA_CHAIN_ID,
    verifyingContract,
  );

export const verifyGuarantorApprovalSignature =
  async (
    input: ApprovalSignatureInput,
  ): Promise<void> => {
    const valid =
      await verifyTypedData({
        address:
          input.guarantorWallet,

        domain,

        types:
          GUARANTOR_APPROVAL_TYPES,

        primaryType:
          "GuarantorApproval",

        message: {
          auctionKey:
            computeAuctionKey(
              input.auctionCode,
            ),

          specHash:
            input.specHash,

          nonce:
            input.nonce,

          expiry:
            input.expiry,
        },

        signature:
          input.signature,
      });

    if (!valid) {
      throw new DomainError(
        "INVALID_SIGNATURE",
        "Guarantor approval signature is invalid.",
      );
    }
  };

export const verifyGuarantorRejectionSignature =
  async (
    input: RejectionSignatureInput,
  ): Promise<void> => {
    const valid =
      await verifyTypedData({
        address:
          input.guarantorWallet,

        domain,

        types:
          GUARANTOR_REJECTION_TYPES,

        primaryType:
          "GuarantorRejection",

        message: {
          auctionKey:
            computeAuctionKey(
              input.auctionCode,
            ),

          reasonHash:
            computeReasonHash(
              input.reason,
            ),

          nonce:
            input.nonce,

          expiry:
            input.expiry,
        },

        signature:
          input.signature,
      });

    if (!valid) {
      throw new DomainError(
        "INVALID_SIGNATURE",
        "Guarantor rejection signature is invalid.",
      );
    }
  };
