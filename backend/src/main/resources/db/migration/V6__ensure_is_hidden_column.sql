DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='is_hidden') THEN 
        ALTER TABLE products ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT FALSE; 
    END IF; 
END $$;
