import type { Env } from "../../../../env";
import {
  json,
  methodNotAllowed,
} from "../../../../http";
import {
  createDatabaseClient,
} from "../../../../lib/database/client";

const CATEGORIES = [
  "OTOMOTIF",
  "PROPERTI",
  "ELEKTRONIK",
  "AKSESORIS_HOBI",
  "PERHIASAN",
] as const;

type Category = (typeof CATEGORIES)[number];

interface GuarantorRow {
  id: string;
  name: string;
  city: string;
  category: string;
  wallet: string;
}

const isCategory = (
  value: string,
): value is Category =>
  CATEGORIES.some(
    (category) => category === value,
  );

export const handleAuctionGuarantors = async (
  request: Request,
  env: Env,
): Promise<Response> => {
  if (request.method !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  const url = new URL(request.url);
  const category = url.searchParams.get(
    "category",
  );

  if (category && !isCategory(category)) {
    return json(
      {
        error: "invalid category",
      },
      {
        status: 400,
      },
    );
  }

  const sql = await createDatabaseClient(env);

  const rows = category
    ? await sql`
        SELECT
          p.id,
          p.name,
          p.city,
          p.category,
          u.wallet
        FROM partners AS p
        INNER JOIN users AS u
          ON u.id = p.user_id
        WHERE p.type = 'GUARANTOR'
          AND p.active = TRUE
          AND (
            p.category = 'ALL'
            OR p.category = ${category}
          )
        ORDER BY p.name ASC, p.id ASC
      `
    : await sql`
        SELECT
          p.id,
          p.name,
          p.city,
          p.category,
          u.wallet
        FROM partners AS p
        INNER JOIN users AS u
          ON u.id = p.user_id
        WHERE p.type = 'GUARANTOR'
          AND p.active = TRUE
        ORDER BY p.name ASC, p.id ASC
      `;

  return json({
    data: (rows as GuarantorRow[]).map(
      (row) => ({
        id: row.id,
        name: row.name,
        city: row.city,
        category: row.category,
        wallet: row.wallet.toLowerCase(),
      }),
    ),
  });
};
