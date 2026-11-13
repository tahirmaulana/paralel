import {
  createPublicClient,
  fallback,
  http,
  type PublicClient,
} from "viem";
import { arbitrumSepolia } from "viem/chains";

import type { Env } from "../../env";

const validateRpcUrl = (value: string): string => {
  const rpcUrl = value.trim();

  if (!rpcUrl) {
    throw new Error("ARBITRUM_RPC_URL is empty.");
  }

  const parsed = new URL(rpcUrl);

  if (
    parsed.protocol !== "https:" &&
    parsed.protocol !== "http:"
  ) {
    throw new Error(
      "ARBITRUM_RPC_URL must use HTTP or HTTPS.",
    );
  }

  return rpcUrl;
};

export const createApplicationPublicClient = async (
  env: Env,
): Promise<PublicClient> => {
  const configuredRpcUrl = validateRpcUrl(
    await env.ARBITRUM_RPC_URL.get(),
  );

  const rpcUrls = Array.from(
    new Set([
      configuredRpcUrl,
      ...arbitrumSepolia.rpcUrls.default.http,
    ]),
  );

  return createPublicClient({
    chain: arbitrumSepolia,
    transport: fallback(
      rpcUrls.map((url) =>
        http(url, {
          timeout: 20_000,
          retryCount: 1,
          retryDelay: 500,
        }),
      ),
    ),
  });
};
