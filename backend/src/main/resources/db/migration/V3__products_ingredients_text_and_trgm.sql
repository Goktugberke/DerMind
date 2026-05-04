-- Product ingredients can hold full INCI lists (~5.5KB observed in CSV).
-- VARCHAR(4000) was truncating long lists, so widen to TEXT.
-- pg_trgm + GIN index speeds up the substring/LIKE based allergen scan
-- in ProductService.matchScore.

ALTER TABLE products
    ALTER COLUMN ingredients TYPE TEXT;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_ingredients_trgm
    ON products
    USING GIN (ingredients gin_trgm_ops);
