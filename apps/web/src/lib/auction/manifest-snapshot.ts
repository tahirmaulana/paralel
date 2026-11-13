import type {
  TransactionSql,
} from 'postgres';

import {
  isSubmitManifestFrozen,
  type SubmitFileManifest,
} from './submit-security';

type AssetManifestRow =
  Readonly<{
    specHashPresent: boolean;
  }>;

type RoundManifestRow =
  Readonly<{
    roundNo: number;
  }>;

export async function readAuctionManifestFrozen(
  transaction: TransactionSql,
  input: Readonly<{
    auctionId: string;
    currentRound: number;
  }>,
): Promise<boolean> {
  const [
    assetRows,
    fileRows,
    roundRows,
  ] = await Promise.all([
    transaction<
      AssetManifestRow[]
    >`
      SELECT
        spec_hash IS NOT NULL
          AS "specHashPresent"
      FROM auction_assets
      WHERE
        auction_id =
          ${input.auctionId}
    `,
    transaction<
      SubmitFileManifest[]
    >`
      SELECT
        kind,
        position
      FROM auction_files
      WHERE
        auction_id =
          ${input.auctionId}
    `,
    transaction<
      RoundManifestRow[]
    >`
      SELECT
        round_no
          AS "roundNo"
      FROM auction_rounds
      WHERE
        auction_id =
          ${input.auctionId}
    `,
  ]);

  return isSubmitManifestFrozen({
    assetSpecHashes:
      assetRows.map(
        (row) =>
          row.specHashPresent,
      ),
    files:
      fileRows,
    currentRound:
      input.currentRound,
    roundNumbers:
      roundRows.map(
        (row) =>
          row.roundNo,
      ),
  });
}
