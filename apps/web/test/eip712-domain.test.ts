import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getParalelEip712Domain,
} from '@paralel/contracts';

test(
  'uses the deployed V3 EIP-712 domain',
  () => {
    const domain =
      getParalelEip712Domain(
        421614,
        '0xa0e47157cffb3385dc3bbed71174c8bb79028632',
      );

    assert.deepEqual(
      domain,
      {
        name:
          'ParalelAuction',
        version:
          '3',
        chainId:
          421614,
        verifyingContract:
          '0xa0e47157cffb3385dc3bbed71174c8bb79028632',
      },
    );
  },
);
