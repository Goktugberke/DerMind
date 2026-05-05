-- users.has_acne sonradan User entity'ye eklendi ama migration olarak yazılmamıştı.
-- ddl-auto=update ile otomatik gelmiş DB'lerde mevcut, fresh DB'lerde yok →
-- prod (validate) ve fresh-clone makinelerde "column has_acne does not exist" hatası.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS has_acne BOOLEAN NOT NULL DEFAULT FALSE;
