-- K5: Allergen normalization — String column → normalized ElementCollection table
-- users.allergens (VARCHAR) → user_allergens(user_id, allergen)

CREATE TABLE IF NOT EXISTS user_allergens (
    user_id  VARCHAR(255) NOT NULL,
    allergen VARCHAR(128) NOT NULL,
    CONSTRAINT fk_user_allergens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_allergens_user_id ON user_allergens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_allergens_allergen ON user_allergens(allergen);

-- Migrate existing comma-separated allergen data (if column still exists on this DB)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
          AND column_name = 'allergens'
    ) THEN
        INSERT INTO user_allergens (user_id, allergen)
        SELECT id, TRIM(LOWER(a))
        FROM users,
             UNNEST(STRING_TO_ARRAY(allergens, ',')) AS a
        WHERE allergens IS NOT NULL
          AND allergens <> ''
          AND TRIM(a) <> ''
        ON CONFLICT DO NOTHING;

        ALTER TABLE users DROP COLUMN allergens;
    END IF;
END
$$;
