import {
  privateKeyToAccount,
  type PrivateKeyAccount,
} from "viem/accounts";

import type { Env } from "../../env";

const normalizePrivateKey = (
  value: string,
): `0x${string}` => {
  const normalized =
    value.trim();

  const prefixed =
    normalized.startsWith("0x")
      ? normalized
      : `0x${normalized}`;

  if (
    !/^0x[0-9a-fA-F]{64}$/.test(
      prefixed,
    )
  ) {
    throw new Error(
      "RELAYER_PRIVATE_KEY must contain exactly 32 bytes.",
    );
  }

  return prefixed as
    `0x${string}`;
};

export const createRelayAccount = async (
  env: Env,
): Promise<PrivateKeyAccount> =>
  privateKeyToAccount(
    normalizePrivateKey(
      await env
        .RELAYER_PRIVATE_KEY
        .get(),
    ),
  );
