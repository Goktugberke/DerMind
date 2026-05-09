import psycopg2

DB_CONFIG = {
    "dbname": "dermind",
    "user": "postgres",
    "password": "postgres",
    "host": "localhost",
    "port": "5438"
}

BAD_IMAGE_URL = "https://duckduckgo.com/dist/react-assets/5b372fc9558d742823b4.png"

def clean_urls():
    conn = None
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Önce kaç tane olduğunu kontrol edelim
        cur.execute("SELECT COUNT(*) FROM products WHERE image_url = %s", (BAD_IMAGE_URL,))
        count = cur.fetchone()[0]
        
        if count == 0:
            print("Temizlenecek hatali URL bulunamadi.")
            return

        print(f"Toplam {count} adet hatali URL bulundu. Temizleniyor...")
        
        # URL'leri NULL yapalım
        cur.execute("UPDATE products SET image_url = NULL WHERE image_url = %s", (BAD_IMAGE_URL,))
        conn.commit()
        
        print(f"Basariyla {count} urunun gorsel URL'si temizlendi.")
        
    except Exception as e:
        print(f"Hata: {str(e).encode('ascii', 'ignore').decode()}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    clean_urls()
