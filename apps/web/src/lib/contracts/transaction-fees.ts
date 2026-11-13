export type Eip1559FeeEstimate =
  Readonly<{
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
  }>;

export function createEip1559FeeOverrides(
  baseFeePerGas: bigint,
  estimate: Eip1559FeeEstimate,
): Eip1559FeeEstimate {
  if (
    baseFeePerGas <= 0n ||
    estimate.maxFeePerGas < 0n ||
    estimate.maxPriorityFeePerGas < 0n
  ) {
    throw new Error(
      'RPC returned invalid EIP-1559 fee data.',
    );
  }

  const maxFeeWithHeadroom =
    baseFeePerGas * 2n +
    estimate.maxPriorityFeePerGas;

  return {
    maxFeePerGas:
      estimate.maxFeePerGas > maxFeeWithHeadroom
        ? estimate.maxFeePerGas
        : maxFeeWithHeadroom,
    maxPriorityFeePerGas:
      estimate.maxPriorityFeePerGas,
  };
}
