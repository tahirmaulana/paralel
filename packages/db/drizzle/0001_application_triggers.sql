CREATE OR REPLACE FUNCTION enforce_document_number_unique() RETURNS trigger AS $$
DECLARE
  conflicting_status text;
BEGIN
  IF NEW.document_number = 'NUL' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.document_number, 0));

  SELECT a.status INTO conflicting_status
  FROM auctions a
  JOIN auction_assets aa ON aa.auction_id = a.id
  WHERE aa.document_number = NEW.document_number
    AND a.id <> NEW.auction_id
    AND a.status NOT IN ('REJECTED', 'CANCELED', 'SETTLED', 'WITHDRAWN')
  LIMIT 1;

  IF conflicting_status IS NOT NULL THEN
    RAISE EXCEPTION 'document_number % already active in another auction (status %)',
      NEW.document_number, conflicting_status
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_document_number_unique ON auction_assets;
--> statement-breakpoint
CREATE TRIGGER trg_document_number_unique
  BEFORE INSERT OR UPDATE ON auction_assets
  FOR EACH ROW EXECUTE FUNCTION enforce_document_number_unique();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_active_document_on_status() RETURNS trigger AS $$
DECLARE
  document_number_value text;
  conflicting_status text;
BEGIN
  IF NEW.status IN ('REJECTED', 'CANCELED', 'SETTLED', 'WITHDRAWN') THEN
    RETURN NEW;
  END IF;

  SELECT aa.document_number INTO document_number_value
  FROM auction_assets aa
  WHERE aa.auction_id = NEW.id;

  IF document_number_value IS NULL OR document_number_value = 'NUL' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(document_number_value, 0));

  SELECT a.status INTO conflicting_status
  FROM auctions a
  JOIN auction_assets aa ON aa.auction_id = a.id
  WHERE aa.document_number = document_number_value
    AND a.id <> NEW.id
    AND a.status NOT IN ('REJECTED', 'CANCELED', 'SETTLED', 'WITHDRAWN')
  LIMIT 1;

  IF conflicting_status IS NOT NULL THEN
    RAISE EXCEPTION 'document_number % already active in another auction (status %)',
      document_number_value, conflicting_status
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_active_document_on_status ON auctions;
--> statement-breakpoint
CREATE TRIGGER trg_active_document_on_status
  BEFORE INSERT OR UPDATE OF status ON auctions
  FOR EACH ROW EXECUTE FUNCTION enforce_active_document_on_status();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_photo_count_5() RETURNS trigger AS $$
DECLARE
  photo_count integer;
BEGIN
  SELECT COUNT(*) INTO photo_count
  FROM auction_files
  WHERE auction_id = NEW.auction_id AND kind = 'PHOTO';

  IF photo_count > 5 THEN
    RAISE EXCEPTION 'auction % has % PHOTO rows; max 5', NEW.auction_id, photo_count
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_photo_count_5 ON auction_files;
--> statement-breakpoint
CREATE TRIGGER trg_photo_count_5
  AFTER INSERT OR UPDATE ON auction_files
  FOR EACH ROW EXECUTE FUNCTION enforce_photo_count_5();
