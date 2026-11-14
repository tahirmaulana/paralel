import type {
  Hex,
} from "viem";

import type {
  PreparedGuarantorRelayPayload,
} from "../relay/intent-repository";
import type {
  GuarantorLifecycleOperation,
  GuarantorLifecyclePreflight,
} from "./lifecycle-preflight";

export const createGuarantorLifecyclePayload =
  (
    input: Readonly<{
      operation:
        GuarantorLifecycleOperation;
      preflight:
        GuarantorLifecyclePreflight;
      nonce: bigint;
      expiry: bigint;
      signature: Hex;
    }>,
  ): Omit<
    PreparedGuarantorRelayPayload,
    | "operation"
    | "derivedTxHash"
    | "serializedTransaction"
  > =>
    Object.freeze({
      auctionId:
        input.preflight
          .projection
          .auctionId,
      auctionCode:
        input.preflight
          .projection
          .auctionCode,
      auctionKey:
        input.preflight
          .auctionKey,
      roundNo:
        input.preflight
          .projection
          .currentRound,
      nonce:
        input.nonce
          .toString(),
      expiry:
        input.expiry
          .toString(),
      signature:
        input.signature,
    });
