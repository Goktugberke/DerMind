#!/usr/bin/env python3
"""
DerMind — Doğrudan DB Tohumlama (seed_products_direct.py)
==========================================================
seed_products.py backend'in POST /api/products endpoint'ine gider; bu endpoint
ADMIN rolü ister. Lokal geliştirme / CI / fresh DB durumlarında admin Firebase
token üretmek pratik değil. Bu script aynı CSV'yi (ve `seed_products.py`'nin
ürettiği aynı payload yapısını) doğrudan PostgreSQL'e yazar.

Kullanım:
  python seed_products_direct.py
  python seed_products_direct.py --truncate          # önce tabloyu temizle
  python seed_products_direct.py --db-url postgresql://postgres:postgres@localhost:5438/dermind

Bağımlılık: psycopg2-binary  (requirements.txt'de mevcut)
"""

import argparse
import logging
import os
import sys
import time
from typing import Iterable

import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch

from seed_products import _build_payload  # tek kaynak: payload mantığı seed_products.py'de

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("dermind-seed-direct")


INSERT_SQL = """
INSERT INTO products (
    name, brand, ingredients, quality_score, sephora_product_id,
    base_score, price, category, secondary_category, sephora_rating
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
ON CONFLICT (sephora_product_id) DO UPDATE SET
    name               = EXCLUDED.name,
    brand              = EXCLUDED.brand,
    ingredients        = EXCLUDED.ingredients,
    quality_score      = EXCLUDED.quality_score,
    base_score         = EXCLUDED.base_score,
    price              = EXCLUDED.price,
    category           = EXCLUDED.category,
    secondary_category = EXCLUDED.secondary_category,
    sephora_rating     = EXCLUDED.sephora_rating
"""


def _payload_to_row(p: dict) -> tuple:
    return (
        p["name"],
        p["brand"],
        p["ingredients"],
        p["qualityScore"],
        p["sephoraProductId"],
        p["baseScore"],
        p.get("price"),
        p.get("category"),
        p.get("secondaryCategory"),
        p.get("sephoraRating"),
    )


def _iter_rows(df: pd.DataFrame) -> Iterable[tuple]:
    seen: set[str] = set()
    for _, row in df.iterrows():
        payload = _build_payload(row)
        sid = payload["sephoraProductId"]
        if sid in seen:
            continue
        seen.add(sid)
        yield _payload_to_row(payload)


def seed(csv_path: str, db_url: str, truncate: bool, batch_size: int) -> None:
    if not os.path.exists(csv_path):
        logger.error(f"CSV bulunamadı: {csv_path}")
        sys.exit(1)

    df = pd.read_csv(csv_path)
    logger.info(f"CSV yüklendi: {len(df):,} ürün  ({csv_path})")

    rows = list(_iter_rows(df))
    logger.info(f"Yazılacak benzersiz satır: {len(rows):,}")

    t_start = time.perf_counter()
    with psycopg2.connect(db_url) as conn:
        with conn.cursor() as cur:
            if truncate:
                logger.warning("TRUNCATE products CASCADE çalıştırılıyor...")
                cur.execute("TRUNCATE products RESTART IDENTITY CASCADE")
            execute_batch(cur, INSERT_SQL, rows, page_size=batch_size)
        conn.commit()

    elapsed = time.perf_counter() - t_start
    logger.info(f"TAMAMLANDI — {len(rows):,} satır {elapsed:.1f}s'de yazıldı")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="DerMind — CSV ürünlerini PostgreSQL'e doğrudan yaz",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--csv",
        default=os.path.join(os.path.dirname(__file__), "dermind_knn_product_vectors.csv"),
        help="Ürün vektör CSV dosya yolu",
    )
    parser.add_argument(
        "--db-url",
        default=os.environ.get(
            "DERMIND_DB_URL",
            "postgresql://postgres:postgres@localhost:5438/dermind",
        ),
        help="PostgreSQL bağlantı URL'si (DERMIND_DB_URL env ile de verilebilir)",
    )
    parser.add_argument(
        "--truncate",
        action="store_true",
        help="Yazmadan önce products tablosunu temizle",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="execute_batch page_size",
    )
    args = parser.parse_args()
    seed(
        csv_path   = args.csv,
        db_url     = args.db_url,
        truncate   = args.truncate,
        batch_size = args.batch_size,
    )
