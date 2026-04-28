-- Flyway baseline migration
-- Mevcut Hibernate ddl-auto=update ile oluşan şemayı baseline olarak kabul ediyoruz.
-- Yeni geliştirmelerde V2__... vb. dosyalarla schema değişiklikleri yapılır.
-- Bu dosya sadece migration zincirinin başlangıç noktasıdır.

-- ShedLock tablosu (multi-instance scheduler distributed lock için)
CREATE TABLE IF NOT EXISTS shedlock (
    name VARCHAR(64) NOT NULL,
    lock_until TIMESTAMP NOT NULL,
    locked_at TIMESTAMP NOT NULL,
    locked_by VARCHAR(255) NOT NULL,
    PRIMARY KEY (name)
);
