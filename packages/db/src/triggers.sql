-- @file packages/db/src/triggers.sql
-- Trigger & constraint yang tidak bisa dibuat via Drizzle schema.
-- Jalankan: npx tsx scripts/db-run-sql.ts packages/db/src/triggers.sql
-- Idempoten (aman dijalankan berkali-kali).

-- ─── document_number unik di antara auction aktif ──────────
-- ref: PARALEL.md D2.3 — satu auctionID aktif per document_number,
--      NUL dikecualikan, status final (REJECTED/CANCELED/SETTLED/WITHDRAWN)
--      tidak menghalangi.
CREATE OR REPLACE FUNCTION enforce_document_number_unique() RETURNS trigger AS $$
DECLARE
  conflicting_status text;
BEGIN
  IF NEW.document_number = 'NUL' THEN RETURN NEW; END IF;

  SELECT a.status INTO conflicting_status
  FROM auctions a
  JOIN auction_assets aa ON aa.auction_id = a.id
  WHERE aa.document_number = NEW.document_number
    AND a.id <> NEW.auction_id
    AND a.status NOT IN ('REJECTED','CANCELED','SETTLED','WITHDRAWN')
  LIMIT 1;

  IF conflicting_status IS NOT NULL THEN
    RAISE EXCEPTION 'document_number % already active in another auction (status %)',
      NEW.document_number, conflicting_status
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_document_number_unique ON auction_assets;
CREATE TRIGGER trg_document_number_unique
  BEFORE INSERT OR UPDATE ON auction_assets
  FOR EACH ROW EXECUTE FUNCTION enforce_document_number_unique();

-- ─── Maksimal 5 foto per auction ────────────────────────────
-- ref: PARALEL.md D2.4 — tepat 5 PHOTO per auction_id.
-- Dicek setelah insert/update; validasi "tepat 5" saat transisi ke PENDING
-- dilakukan di aplikasi.
CREATE OR REPLACE FUNCTION enforce_photo_count_5() RETURNS trigger AS $$
DECLARE
  photo_count int;
BEGIN
  SELECT COUNT(*) INTO photo_count
  FROM auction_files
  WHERE auction_id = NEW.auction_id AND kind = 'PHOTO';

  IF photo_count > 5 THEN
    RAISE EXCEPTION 'auction % has % PHOTO rows; max 5', NEW.auction_id, photo_count;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_photo_count_5 ON auction_files;
CREATE TRIGGER trg_photo_count_5
  AFTER INSERT OR UPDATE ON auction_files
  FOR EACH ROW EXECUTE FUNCTION enforce_photo_count_5();