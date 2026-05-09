import pandas as pd
import os

csv_path = "ai-server/datasets/sephora_dataset/product_info.csv"
output_sql = "update_prices.sql"

if not os.path.exists(csv_path):
    print(f"CSV not found at {csv_path}")
    exit(1)

df = pd.read_csv(csv_path)

with open(output_sql, "w", encoding="utf-8") as f:
    f.write("-- Update product prices and ratings from AI dataset\n")
    for _, row in df.iterrows():
        pid = str(row['product_id'])
        price = row['price_usd']
        
        if pd.notna(price):
            sql = f"UPDATE products SET price = {price} WHERE sephora_product_id = '{pid}';\n"
            f.write(sql)

print(f"Generated {output_sql} with {len(df)} updates.")
