"""
DerMind - Product Seeder
=========================
dermind_knn_product_vectors.csv'deki gercek urunleri
PostgreSQL'deki products tablosuna aktarir.

Kullanim:
    pip install psycopg2-binary pandas
    python seed_products.py

Varsayilan baglanti: postgresql://postgres:postgres@localhost:5432/dermind
Degistirmek icin asagidaki DB_* degiskenlerini duzenle.
"""

import os
import sys
import math
import pandas as pd
import psycopg2
from psycopg2.extras import execute_batch

# ── Veritabani baglantion ayarlari ──────────────────────────
DB_HOST = "localhost"
DB_PORT = 5438
DB_NAME = "dermind"
DB_USER = "postgres"
DB_PASS = "postgres"
# ─────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(BASE_DIR, "dermind_knn_product_vectors.csv")

print("=" * 60)
print("DerMind Product Seeder")
print("=" * 60)

# ── 1. CSV yukle ──
print(f"\n[1] CSV yukleniyor: {CSV_PATH}")
df = pd.read_csv(CSV_PATH)
print(f"    Toplam urun: {len(df)}")

# ── 2. Temizle / donustur ──
print(f"\n[2] Veri temizleniyor...")

# NaN degerleri None'a cevir (psycopg2 None'i NULL olarak isler)
def clean(val):
    if val is None:
        return None
    if isinstance(val, float) and math.isnan(val):
        return None
    return val

# ── 3. DB baglantisi ──
print(f"\n[3] PostgreSQL'e baglaniliyor ({DB_HOST}:{DB_PORT}/{DB_NAME})...")
try:
    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
        user=DB_USER, password=DB_PASS
    )
    cur = conn.cursor()
    print("    Baglanti basarili.")
except Exception as e:
    print(f"    HATA: Baglanti kurulamadi -> {e}")
    sys.exit(1)

# ── 4. Mevcut urun sayisini kontrol et ──
cur.execute("SELECT COUNT(*) FROM products;")
existing = cur.fetchone()[0]
print(f"\n[4] Tabloda mevcut urun sayisi: {existing}")

if existing > 0:
    print("    Tablo bos degil. Sadece yeni (sephora_product_id yoksa) urunler eklenecek.")

# ── 5. INSERT sorgusu ──
INSERT_SQL = """
INSERT INTO products (
    name, brand, ingredients,
    quality_score, base_score, sephora_product_id,
    category, secondary_category,
    price, sephora_rating
)
VALUES (
    %(name)s, %(brand)s, %(ingredients)s,
    %(quality_score)s, %(base_score)s, %(sephora_product_id)s,
    %(category)s, %(secondary_category)s,
    %(price)s, %(sephora_rating)s
)
ON CONFLICT (sephora_product_id) DO NOTHING;
"""

print(f"\n[5] Urunler aktariliyor...")

records = []
for _, row in df.iterrows():
    base = clean(row.get("base_score"))
    records.append({
        "name":                clean(row.get("product_name")),
        "brand":               clean(row.get("brand_name")),
        "ingredients":         None,   # CSV'de yok, ilerisi icin bos
        "quality_score":       base,
        "base_score":          base,
        "sephora_product_id":  clean(row.get("product_id")),
        "category":            clean(row.get("primary_category")),
        "secondary_category":  clean(row.get("secondary_category")),
        "price":               clean(row.get("price_usd")),
        "sephora_rating":      clean(row.get("rating")),
    })

try:
    execute_batch(cur, INSERT_SQL, records, page_size=500)
    conn.commit()
    print(f"    Basarili! {len(records)} urun islendi.")
except Exception as e:
    conn.rollback()
    print(f"    HATA: {e}")
    cur.close()
    conn.close()
    sys.exit(1)

# ── 6. Sonuc raporu ──
cur.execute("SELECT COUNT(*) FROM products;")
total = cur.fetchone()[0]

cur.execute("SELECT category, COUNT(*) FROM products GROUP BY category ORDER BY COUNT(*) DESC;")
cats = cur.fetchall()

print(f"\n[6] Sonuc:")
print(f"    Tablodaki toplam urun: {total}")
print(f"    Kategori dagilimi:")
for cat, count in cats:
    print(f"      {cat or 'Bilinmiyor'}: {count}")

cur.close()
conn.close()
print("\n✓ Seeder tamamlandi!")
