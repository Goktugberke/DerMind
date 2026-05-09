# Yapman Gereken Komutlar (Sırasıyla)

## Adım 1: TypeScript Fix'lerini Commit Et ve Push Et

Az önce yaptığımız 3 dosyadaki TypeScript düzeltmeleri henüz commit edilmedi.
(Landing.tsx, ProductDetail.tsx, api.ts)

```powershell
git add -A
git commit -m "fix: resolve TypeScript build errors for rating undefined checks and missing productBrand field"
git push origin dev
```

## Adım 2: Main Branch'ine Geç ve Dev'i Merge Et

```powershell
git checkout main
git pull origin main
git merge dev -m "Merge dev into main"
git push origin main
```

## Adım 3: Tüm LOCAL Branch'leri Sil (main hariç)

```powershell
git branch | Where-Object { $_ -notmatch '^\*?\s*main$' } | ForEach-Object { git branch -D $_.Trim() }
```

## Adım 4: Tüm REMOTE Branch'leri Sil (main hariç)

```powershell
git branch -r | Where-Object { $_ -notmatch 'origin/(main|HEAD)' } | ForEach-Object { $b = $_.Trim() -replace 'origin/', ''; git push origin --delete $b }
```

---

> **NOT:** Bu dosyayı okuduktan sonra silebilirsin. İşler bitince `KOMUTLAR.md` dosyasını silmeyi unutma.
