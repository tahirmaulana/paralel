import {
  isSubmitManifestFrozen,
  type SubmitFileManifest,
} from "./submit-security";

import type { Env } from "../../env";
import {
  createDatabaseClient,
} from "../database/client";

interface AssetManifestRow {
  spec_hash_present: boolean;
}

interface FileManifestRow {
  kind: string;
  position: number | null;
}

interface RoundManifestRow {
  round_no: number;
}

export interface AuctionManifestSnapshot {
  frozen: boolean;
  assetCount: number;
  fileCount: number;
  photoCount: number;
  documentCount: number;
  roundNumbers:
    readonly number[];
}

export const readAuctionManifestSnapshot =
  async (
    env: Env,
    input: Readonly<{
      auctionId: string;
      currentRound: number;
    }>,
  ): Promise<AuctionManifestSnapshot> => {
    const sql =
      await createDatabaseClient(env);

    const [
      assetRows,
      fileRows,
      roundRows,
    ] = await Promise.all([
      sql`
        SELECT
          spec_hash IS NOT NULL
            AS spec_hash_present
        FROM auction_assets
        WHERE auction_id =
          ${input.auctionId}
      `,

      sql`
        SELECT
          kind,
          position
        FROM auction_files
        WHERE auction_id =
          ${input.auctionId}
        ORDER BY
          kind,
          position NULLS LAST,
          id
      `,

      sql`
        SELECT
          round_no
        FROM auction_rounds
        WHERE auction_id =
          ${input.auctionId}
        ORDER BY round_no
      `,
    ]);

    const assets =
      assetRows as AssetManifestRow[];

    const files =
      fileRows as FileManifestRow[];

    const rounds =
      roundRows as RoundManifestRow[];

    const manifestFiles:
      SubmitFileManifest[] =
        files.map((row) => ({
          kind:
            row.kind,
          position:
            row.position,
        }));

    const roundNumbers =
      rounds.map(
        (row) =>
          row.round_no,
      );

    return Object.freeze({
      frozen:
        isSubmitManifestFrozen({
          assetSpecHashes:
            assets.map(
              (row) =>
                row
                  .spec_hash_present,
            ),
          files:
            manifestFiles,
          currentRound:
            input.currentRound,
          roundNumbers,
        }),

      assetCount:
        assets.length,

      fileCount:
        files.length,

      photoCount:
        files.filter(
          (row) =>
            row.kind === "PHOTO",
        ).length,

      documentCount:
        files.filter(
          (row) =>
            row.kind ===
              "DOCUMENT_SCAN" &&
            row.position === null,
        ).length,

      roundNumbers:
        Object.freeze(
          [...roundNumbers],
        ),
    });
  };

export const readAuctionManifestFrozen =
  async (
    env: Env,
    input: Readonly<{
      auctionId: string;
      currentRound: number;
    }>,
  ): Promise<boolean> =>
    (
      await readAuctionManifestSnapshot(
        env,
        input,
      )
    ).frozen;
