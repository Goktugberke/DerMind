#!/usr/bin/env python3
"""
DerMind — Ürün Tohumlama Betiği (seed_products.py)
====================================================
dermind_knn_product_vectors.csv dosyasındaki ürünleri
Spring Boot backend'ine POST /api/products üzerinden aktarır.

Çalıştırma:
  python seed_products.py                              # varsayılan ayarlar
  python seed_products.py --dry-run                   # veritabanına yazmadan önizle
  python seed_products.py --backend-url http://host:8080 --batch-size 50
  python seed_products.py --token Bearer eyJhb...     # JWT ile

Not: ProductCreateDTO şu an sadece name, brand, ingredients, qualityScore
     alanlarını kabul ediyor. sephoraProductId, price, category gibi alanlar
     için backend ProductCreateDTO güncellenmelidir (bkz. TODO.md).
"""

import argparse
import json
import logging
import os
import sys
import time

import pandas as pd
import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("dermind-seed")

# Backend'deki mevcut ürünleri çek ve product name → id map'i kur
def _fetch_existing(backend_url: str, headers: dict) -> set[str]:
    try:
        r = requests.get(f"{backend_url}/api/products", headers=headers, timeout=10)
        r.raise_for_status()
        names = {p["name"].strip().lower() for p in r.json()}
        logger.info(f"  Backend'de mevcut ürün sayısı: {len(names):,}")
        return names
    except Exception as exc:
        logger.warning(f"  Mevcut ürünler alınamadı, tüm kayıtlar eklenir: {exc}")
        return set()


def _build_payload(row: pd.Series) -> dict:
    """CSV satırı → ProductCreateDTO JSON."""
    name  = str(row["product_name"]).strip()
    brand = str(row["brand_name"]).strip()

    # ingredients: CSV'de ham metin yok, özellik sayısından özet üret
    good_flags = [
        col.replace("good_for_", "")
        for col in row.index
        if col.startswith("good_for_") and row[col] > 0
    ]
    ingredient_summary = (
        f"Contains {int(row.get('ingredient_count', 0))} ingredients. "
        f"Beneficial for: {', '.join(good_flags) if good_flags else 'general use'}. "
        f"Banned: {int(row.get('banned_count', 0))}, "
        f"Restricted: {int(row.get('restricted_count', 0))}."
    )

    quality = float(row.get("base_score", 5.0))
    quality = max(0.0, min(10.0, quality))   # 0-10 aralığına kısıt

    base_score = float(row.get("base_score", quality))
    base_score = max(0.0, min(10.0, base_score))

    payload: dict = {
        "name":             name,
        "brand":            brand,
        "ingredients":      ingredient_summary,
        "qualityScore":     round(quality, 2),
        # AI server entegrasyonu için zorunlu alan
        "sephoraProductId": str(row["product_id"]).strip(),
        "baseScore":        round(base_score, 2),
    }

    # Opsiyonel alanlar — CSV'de varsa ekle
    if "price_usd" in row.index and not pd.isna(row["price_usd"]):
        payload["price"] = round(float(row["price_usd"]), 2)
    if "category" in row.index and not pd.isna(row["category"]):
        payload["category"] = str(row["category"]).strip()
    if "secondary_category" in row.index and not pd.isna(row["secondary_category"]):
        payload["secondaryCategory"] = str(row["secondary_category"]).strip()
    if "rating" in row.index and not pd.isna(row["rating"]):
        rating = max(1.0, min(5.0, float(row["rating"])))
        payload["sephoraRating"] = round(rating, 2)

    return payload


def seed(
    csv_path:    str,
    backend_url: str,
    token:       str,
    dry_run:     bool,
    batch_size:  int,
    skip_existing: bool,
    delay_ms:    int,
) -> None:
    # ── Yükle ──
    if not os.path.exists(csv_path):
        logger.error(f"CSV bulunamadı: {csv_path}")
        sys.exit(1)

    df = pd.read_csv(csv_path)
    logger.info(f"CSV yüklendi: {len(df):,} ürün  ({csv_path})")

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = token if token.startswith("Bearer") else f"Bearer {token}"

    # ── Sunucu erişilebilir mi? ──
    if not dry_run:
        try:
            r = requests.get(f"{backend_url}/api/products", headers=headers, timeout=8)
            r.raise_for_status()
            logger.info(f"Backend erişilebilir: {backend_url}")
        except Exception as exc:
            logger.error(f"Backend'e bağlanılamadı ({backend_url}): {exc}")
            sys.exit(1)

    existing_names: set[str] = set()
    if skip_existing and not dry_run:
        existing_names = _fetch_existing(backend_url, headers)

    # ── Gönder ──
    total    = len(df)
    success  = 0
    skipped  = 0
    failed   = 0
    t_start  = time.perf_counter()

    logger.info(f"{'[DRY-RUN] ' if dry_run else ''}Ekleme başlıyor...")
    logger.info("─" * 60)

    for i, (_, row) in enumerate(df.iterrows(), 1):
        payload = _build_payload(row)
        name_key = payload["name"].strip().lower()

        if skip_existing and name_key in existing_names:
            skipped += 1
            if i % 500 == 0:
                logger.info(f"  [{i:>5}/{total}] atlandı (mevcut): {payload['name'][:40]}")
            continue

        if dry_run:
            if i <= 5 or i == total:
                logger.info(
                    f"  [DRY {i:>5}/{total}] {payload['name'][:35]:<35} "
                    f"brand={payload['brand'][:20]:<20} quality={payload['qualityScore']}"
                )
            elif i == 6:
                logger.info(f"  ... ({total - 2} ürün daha) ...")
            success += 1
            continue

        try:
            r = requests.post(
                f"{backend_url}/api/products",
                headers=headers,
                data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
                timeout=10,
            )
            if r.status_code in (200, 201):
                success += 1
            else:
                failed += 1
                logger.warning(
                    f"  [{i:>5}/{total}] HATA {r.status_code}: "
                    f"{payload['name'][:30]} → {r.text[:80]}"
                )
        except requests.RequestException as exc:
            failed += 1
            logger.error(f"  [{i:>5}/{total}] İSTEK HATASI: {exc}")

        if i % batch_size == 0:
            elapsed = time.perf_counter() - t_start
            rate    = success / elapsed if elapsed > 0 else 0
            logger.info(
                f"  [{i:>5}/{total}] ✓={success}  ✗={failed}  skip={skipped}  "
                f"hız={rate:.0f}/s"
            )

        if delay_ms > 0:
            time.sleep(delay_ms / 1000)

    # ── Özet ──
    elapsed = time.perf_counter() - t_start
    logger.info("─" * 60)
    mode = "[DRY-RUN] " if dry_run else ""
    logger.info(f"{mode}TAMAMLANDI — {elapsed:.1f}s")
    logger.info(f"  Toplam   : {total:,}")
    logger.info(f"  Başarılı : {success:,}")
    logger.info(f"  Atlandı  : {skipped:,}  (mevcut)")
    logger.info(f"  Hata     : {failed:,}")
    if failed > 0:
        logger.warning("  Hata olan kayıtlar için backend loglarını kontrol edin.")


# ─────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="DerMind — CSV ürünlerini Spring Boot backend'ine aktar",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--csv",
        default=os.path.join(os.path.dirname(__file__), "dermind_knn_product_vectors.csv"),
        help="Ürün vektör CSV dosya yolu",
    )
    parser.add_argument(
        "--backend-url",
        default="http://localhost:8080",
        help="Spring Boot backend base URL",
    )
    parser.add_argument(
        "--token",
        default="",
        help="JWT Bearer token (gerekiyorsa)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Gerçekten kaydetmeden önizle",
    )
    parser.add_argument(
        "--no-skip-existing",
        action="store_true",
        help="Mevcut ürünleri de yeniden ekle (varsayılan: atla)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Log her N işlemde bir yazdırılır",
    )
    parser.add_argument(
        "--delay-ms",
        type=int,
        default=0,
        help="Her istek arasında beklenecek ms (rate limit için)",
    )
    args = parser.parse_args()
    seed(
        csv_path       = args.csv,
        backend_url    = args.backend_url.rstrip("/"),
        token          = args.token,
        dry_run        = args.dry_run,
        batch_size     = args.batch_size,
        skip_existing  = not args.no_skip_existing,
        delay_ms       = args.delay_ms,
    )
