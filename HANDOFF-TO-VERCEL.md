# 🤝 Handoff — Sisanya tinggal Vercel + Neon + GitHub

Saya (Claude) sudah selesai semua yang bisa dari sisi kode. Sekarang giliran kamu deploy.

---

## ✅ Yang sudah saya kerjakan

- [x] Fix `prisma/schema.prisma` (diff syntax `-` `+` yang nyangkut sudah dibersihkan)
- [x] Fix `.env` (struktur sudah benar lagi)
- [x] **Generate `AUTH_SECRET` production** — sudah ada di `.env`, copy untuk Vercel
- [x] **Generate `VAULT_PASSCODE` random** — sudah ada di `.env`, ganti ke yang mudah diingat kalau mau
- [x] Regenerate Prisma client untuk PostgreSQL
- [x] Validate schema (✓ valid)
- [x] `git init` + initial commit (43 file)
- [x] Verify `.env` & `dev.db` tidak ke-commit
- [x] Set `vercel.json` dengan region Singapore (`sin1`) — terdekat dari Indonesia
- [x] Build command sudah include `prisma generate && prisma db push && next build` (auto-sync schema saat deploy)

**Commit history saat ini:**
```
ef3a057 chore: configure Vercel deployment region (Singapore)
06b3e6b feat: initial RyLis website
```

---

## 🎯 Tinggal yang kamu kerjakan

### ① Bikin database di Neon (5 menit)

1. Buka **https://neon.tech** → Sign up with Google
2. **Create project**:
   - Name: `rylis`
   - Postgres version: 16
   - Region: **Asia Pacific (Singapore)** ← penting, satu region dengan Vercel
3. Setelah project aktif, copy **Connection string (Pooled)**.
   Bentuknya:
   ```
   postgresql://neondb_owner:xxxxxx@ep-xxxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. **Paste ke `.env` lokal** — ganti baris `DATABASE_URL=...` yang masih placeholder `USER:PASSWORD@ep-xxxxx`.

### ② Push schema + seed ke Neon (1 menit)

Setelah `.env` punya URL Neon asli, di terminal:

```cmd
cd D:\Projects\Claude\RyLis
npx prisma db push
npm run db:seed
```

Output yang diharapkan:
```
🚀  Your database is now in sync with your Prisma schema.
✓ Seeded Ryan (ryan / ryan123) and Lisa (lisa / lisa123)
```

> Test sebentar lokal: `npm run dev` → buka http://localhost:4747 → login `ryan/ryan123` → harus berhasil (data masih kosong tapi tidak error).

### ③ Push ke GitHub private (3 menit)

**Pakai GitHub CLI** (paling cepat):
```cmd
gh auth login
gh repo create rylis --private --source=. --push
```

**Atau manual:**
1. Buka **https://github.com/new** → name `rylis` → **Private** → Create
2. Copy URL repo (`https://github.com/USERNAME/rylis.git`)
3. Terminal:
   ```cmd
   git remote add origin https://github.com/USERNAME/rylis.git
   git push -u origin main
   ```

### ④ Deploy ke Vercel (5 menit)

1. Buka **https://vercel.com/signup** → Continue with GitHub
2. **Add New → Project** → pilih repo **rylis** → **Import**
3. **Framework Preset**: Next.js (auto-detected) ✓ — biarkan semua default
4. **JANGAN deploy dulu** — expand **Environment Variables**:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | (Neon connection string, sama dengan `.env`) |
   | `AUTH_SECRET` | `560fe622a6427a20f01834877aad550dbf9cbf430163ae3d1fc1a63add486dbe` |
   | `VAULT_PASSCODE` | `511e33b522470526` (atau yang kamu pilih sendiri) |
   | `GOOGLE_DRIVE_API_KEY` | (kosongkan, isi nanti setelah setup Google Cloud) |

   Centang semua environment (Production, Preview, Development) untuk masing-masing.

5. Klik **Deploy** → tunggu ~2 menit
6. Setelah hijau ✓, klik **Visit** → harus muncul halaman login RyLis

### ⑤ Ganti password default Ryan & Lisa (2 menit) ⚠️ PENTING

Default `ryan123`/`lisa123` **HARUS** diganti sebelum dianggap live.

Pastikan `.env` lokal sudah pointing ke Neon production (Step ①), lalu:

```cmd
cd D:\Projects\Claude\RyLis
npx tsx scripts/change-password.ts ryan PasswordRahasiaRyan2026
npx tsx scripts/change-password.ts lisa PasswordRahasiaLisa2026
```

(Ganti `PasswordRahasiaRyan2026` dengan yang kamu pilih)

Test login di URL Vercel pakai password baru → harus berhasil.

---

## 🎉 Setelah Step ⑤ — kamu LIVE!

Bookmark URL Vercel di HP berdua. Mulai pakai. 

### Untuk update kode setelahnya
```cmd
# edit kode...
git add .
git commit -m "feat: tambah X"
git push
```
Vercel auto-deploy dalam ~2 menit setiap push ke `main`.

---

## 📝 Catatan keamanan

Nilai yang sudah saya generate dan masuk ke `.env`:
- `AUTH_SECRET` = `560fe622a6427a20f01834877aad550dbf9cbf430163ae3d1fc1a63add486dbe`
- `VAULT_PASSCODE` = `511e33b522470526`

**Pakai value yang sama persis** di Vercel env vars supaya session konsisten kalau kamu test lintas environment. Tapi karena `.env` tidak masuk git, value ini cuma ada di komputer kamu + Vercel — tidak terekspos di GitHub.

Kalau merasa value-nya sudah kelihatan terlalu banyak orang (mis. share screen waktu coding), regenerate aja:
```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Lalu update di kedua tempat (`.env` lokal + Vercel env vars) lalu redeploy.

---

## 🆘 Kalau stuck

| Step | Gejala | Fix |
|---|---|---|
| ② | `Error: P1001 Can't reach database` | Cek `DATABASE_URL` ada `?sslmode=require` di akhir |
| ② | `column ... does not exist` | Run `npx prisma db push --accept-data-loss` (untuk DB yang baru, pertama kali) |
| ③ | `gh: command not found` | Install GitHub CLI dari https://cli.github.com, atau pakai cara manual |
| ④ | Vercel build gagal di `prisma db push` | Cek `DATABASE_URL` di Vercel env vars sudah benar |
| ⑤ | `User "ryan" tidak ditemukan` | Step ② belum jalan — seed dulu |

---

Selesai. Kalau ada step yang stuck, screenshot errornya ke saya. 🌸
