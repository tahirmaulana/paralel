import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEip1559FeeOverrides,
} from '../src/lib/contracts/transaction-fees';

test(
  'adds base-fee headroom when the RPC estimate is below the current base fee',
  () => {
    const overrides =
      createEip1559FeeOverrides(
        20_046_000n,
        {
          maxFeePerGas:
            20_042_000n,
          maxPriorityFeePerGas:
            1_000_000n,
        },
      );

    assert.equal(
      overrides.maxFeePerGas,
      41_092_000n,
    );
    assert.equal(
      overrides.maxPriorityFeePerGas,
      1_000_000n,
    );
    assert.ok(
      overrides.maxFeePerGas > 20_046_000n,
    );
  },
);

test(
  'preserves an RPC estimate that already exceeds the buffered base fee',
  () => {
    const overrides =
      createEip1559FeeOverrides(
        20_046_000n,
        {
          maxFeePerGas:
            100_000_000n,
          maxPriorityFeePerGas:
            1_000_000n,
        },
      );

    assert.equal(
      overrides.maxFeePerGas,
      100_000_000n,
    );
  },
);

test(
  'rejects invalid RPC fee data explicitly',
  () => {
    assert.throws(
      () =>
        createEip1559FeeOverrides(
          0n,
          {
            maxFeePerGas:
              1n,
            maxPriorityFeePerGas:
              1n,
          },
        ),
      /invalid EIP-1559 fee data/i,
    );
  },
);
