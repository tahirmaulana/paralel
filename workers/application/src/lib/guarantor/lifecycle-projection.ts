import {
  DomainError,
} from "@paralel/domain";
import {
  getAddress,
  type Address,
} from "viem";

import type { Env } from "../../env";
import {
  createDatabaseClient,
} from "../database/client";

interface LifecycleProjectionRow {
  auction_id: string;
  auction_code: string;
  status: string;
  current_round: number;
  consignor_wallet: string;
  guarantor_partner_id: string;
  guarantor_wallet: string;
}

export interface GuarantorLifecycleProjection {
  auctionId: string;
  auctionCode: string;
  status: string;
  currentRound: number;
  consignorWallet: Address;
  guarantorPartnerId: string;
  guarantorWallet: Address;
}

export const readGuarantorLifecycleProjection =
  async (
    env: Env,
    auctionId: string,
  ): Promise<
    GuarantorLifecycleProjection
  > => {
    const sql =
      await createDatabaseClient(env);

    const rows = await sql`
      SELECT
        a.id AS auction_id,
        a.auction_code,
        a.status,
        a.current_round,
        consignor.wallet
          AS consignor_wallet,
        guarantor.id
          AS guarantor_partner_id,
        guarantor_user.wallet
          AS guarantor_wallet
      FROM auctions AS a
      INNER JOIN users AS consignor
        ON consignor.id =
          a.consignor_id
      INNER JOIN partners AS guarantor
        ON guarantor.id =
          a.guarantor_id
       AND guarantor.type =
          'GUARANTOR'
      INNER JOIN users AS guarantor_user
        ON guarantor_user.id =
          guarantor.user_id
      WHERE a.id =
        ${auctionId}
      LIMIT 1
    `;

    const row =
      rows[0] as
        | LifecycleProjectionRow
        | undefined;

    if (!row) {
      throw new DomainError(
        "AUCTION_NOT_FOUND",
        "Auction was not found.",
        {
          details: {
            auctionId,
          },
        },
      );
    }

    return Object.freeze({
      auctionId:
        row.auction_id,
      auctionCode:
        row.auction_code,
      status:
        row.status,
      currentRound:
        row.current_round,
      consignorWallet:
        getAddress(
          row.consignor_wallet,
        ),
      guarantorPartnerId:
        row.guarantor_partner_id,
      guarantorWallet:
        getAddress(
          row.guarantor_wallet,
        ),
    });
  };
