import undetected_chromedriver as uc
from bs4 import BeautifulSoup
import time
import re
import pandas as pd
from urllib.parse import urljoin

base_url = "https://incibeauty.com"
search_url = "https://incibeauty.com/en/search/k/Sun+cream?sf=category&d=1&page="


# Tarayıcıyı başlatan fonksiyon
def init_driver():
    options = uc.ChromeOptions()
    # Not: Arka planda çalışması için '--headless' eklenebilir ancak Cloudflare bazen
    # ekransız tarayıcıları sezebilir. Şimdilik tarayıcının ekranda açıldığını ve
    # Cloudflare'i nasıl geçtiğini kendi gözlerinle gör.
    driver = uc.Chrome(options=options, version_main=145)
    # Pencereyi tam ekran yapmak bazen bot algılamasını düşürür
    driver.maximize_window()
    return driver


def scrape_product(driver, product_url):
    try:
        driver.get(product_url)
        time.sleep(3)

        soup = BeautifulSoup(driver.page_source, "html.parser")

        # 1. Marka (itemprop="brand" kullanıyoruz)
        brand_tag = soup.find(attrs={"itemprop": "brand"})
        brand = brand_tag.get_text(strip=True) if brand_tag else None

        # 2. Ürün Adı (itemprop="name" kullanıyoruz)
        name_tag = soup.find(attrs={"itemprop": "name"})
        product_name = name_tag.get_text(strip=True) if name_tag else None

        # 3. Puan (note-produit sınıfını arıyoruz)
        rating_tag = soup.find("div", class_=re.compile("note-produit"))
        # Örn: "19 / 20" şeklindeki metni alıp boşlukları siliyoruz -> "19/20"
        rating = rating_tag.get_text(strip=True).replace("\n", "").replace(" ", "") if rating_tag else None

        # 4. İçerikler (İçinde "Composition" yazan h2'yi bulup bir sonraki div'in içindeki metni alıyoruz)
        ingredients = None
        composition_h2 = soup.find(lambda tag: tag.name == "h2" and "Composition" in tag.text)
        if composition_h2:
            comp_div = composition_h2.find_next_sibling("div")
            if comp_div:
                ingredients = comp_div.get_text(strip=True)

        return {
            "brand": brand,
            "product_name": product_name,
            "rating": rating,
            "ingredients": ingredients,
            "url": product_url
        }

    except Exception as e:
        print(f"Hata oluştu ({product_url}):", e)
        return None

# Tarayıcıyı başlat
print("Gerçek Chrome tarayıcısı başlatılıyor, lütfen açılan pencereyi kapatmayın...")
driver = init_driver()
all_products_data = []

try:
    for page in range(2, 5):
        print(f"\n=== Sayfa: {page} ===")

        try:
            # Arama sayfasını tarayıcıda aç
            driver.get(search_url + str(page))
            time.sleep(4)  # Cloudflare kontrolü için bekle

            soup = BeautifulSoup(driver.page_source, "html.parser")
            all_links = soup.find_all("a", href=True)
            product_links = []

            for link in all_links:
                href = link["href"]
                if "/en/produit/" in href:
                    full_url = urljoin(base_url, href)
                    product_links.append(full_url)

            product_links = list(set(product_links))
            print("Bulunan ürün sayısı:", len(product_links))

            for product_url in product_links:
                print("Çekiliyor:", product_url)
                product_data = scrape_product(driver, product_url)

                if product_data:
                    all_products_data.append(product_data)

            time.sleep(2)

        except Exception as e:
            print("Sayfa hatası:", e)

finally:
    # Hata olsa bile en sonunda tarayıcıyı kapat
    print("\nTarayıcı kapatılıyor...")
    driver.quit()

print("Veri işleniyor ve CSV'ye dönüştürülüyor...")

if len(all_products_data) > 0:
    df = pd.DataFrame(all_products_data)


    def clean_ingredients(ing_str):
        if not ing_str or pd.isna(ing_str):
            return ""

        # İçerikleri virgüllerden ayır ve küçük harf yap
        ingredients_list = [i.strip().lower() for i in ing_str.split(',')]

        cleaned_list = []
        for item in ingredients_list:
            # Sansürlü yıldızları veya boş içerikleri atla
            if "******" in item or not item:
                continue

            # İçeriğin sonundaki (*) gibi işaretleri sil
            item = item.replace("(*)", "").replace("*", "").strip()

            cleaned_list.append(item)

        return "|".join(cleaned_list)


    df['clean_ingredients'] = df['ingredients'].apply(clean_ingredients)
    one_hot_df = df['clean_ingredients'].str.get_dummies(sep='|')

    if "" in one_hot_df.columns:
        one_hot_df = one_hot_df.drop(columns=[""])

    final_df = pd.concat([df, one_hot_df], axis=1)
    final_df = final_df.drop(columns=['clean_ingredients'])

    csv_filename = "incibeauty_products_onehot.csv"
    final_df.to_csv(csv_filename, index=False, encoding='utf-8-sig')

    print(f"\nBaşarılı! Toplam {len(final_df)} ürün işlendi ve '{csv_filename}' adıyla kaydedildi.")
else:
    print("Hiç veri çekilemedi.")