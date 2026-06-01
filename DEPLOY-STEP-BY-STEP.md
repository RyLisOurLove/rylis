# 🚀 RyLis — Alur Deploy Live (Step-by-Step)

Panduan ini bisa diselesaikan dalam **~45 menit** dari nol sampai website live di domain sendiri.

Stack target:
- **Hosting**: Vercel (free tier)
- **Database**: Neon Postgres (free tier)
- **Code**: GitHub private repo
- **Domain**: opsional (vercel.app subdomain juga jalan)

---

## ✅ Checklist persiapan (sebelum mulai)

- [ ] Sudah punya akun GitHub (kalau belum: [github.com/signup](https://github.com/signup))
- [ ] Sudah punya akun Google (untuk Vercel & Neon SSO)
- [ ] Git terinstall di komputer (`git --version` di terminal)
- [ ] Node.js v20+ terinstall (`node --version`)
- [ ] Domain (opsional — kalau mau `rylis.app` atau semacamnya)

---

# FASE 1 — Migrasi Database ke Postgres (10 menit)

SQLite (`dev.db`) bagus untuk lokal, tapi Vercel pakai serverless filesystem — data hilang tiap deploy. Pindah ke Postgres dulu.

## Step 1.1 — Bikin database di Neon

1. Buka [neon.tech](https://neon.tech) → **Sign up with Google**
2. Klik **Create a project**
   - **Project name**: `rylis`
   - **Postgres version**: 16 (default)
   - **Region**: pilih **Asia Pacific (Singapore)** ← terdekat dari Indonesia
3. Setelah project dibuat, akan muncul **Connection string**. Copy yang format:
   ```
   postgresql://username:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Simpan di notepad — akan dipakai 2× (lokal & Vercel)

## Step 1.2 — Update Prisma schema

Edit `prisma/schema.prisma`:

```diff
 datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
   url      = env("DATABASE_URL")
 }
```

## Step 1.3 — Update `.env` lokal

Ganti baris `DATABASE_URL` di `.env`:

```diff
- DATABASE_URL="file:./dev.db"
+ DATABASE_URL="postgresql://username:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
```

## Step 1.4 — Push schema & seed ke Neon

```cmd
cd D:\Projects\Claude\RyLis
npx prisma db push
npm run db:seed
```

Output yang diharapkan:
```
✔ Generated Prisma Client
🚀  Your database is now in sync with your Prisma schema.
✓ Seeded Ryan (ryan / ryan123) and Lisa (lisa / lisa123)
```

## Step 1.5 — Test lokal

```cmd
npm run dev
```

Buka http://localhost:4747 → login `ryan` / `ryan123` → data harus muncul (kosong tapi tanpa error).

> Kalau error connection: pastikan Neon project status **Active** (free tier akan auto-suspend after 5 menit idle — tapi akan auto-wake saat di-query).

---

# FASE 2 — Push Code ke GitHub Private (5 menit)

## Step 2.1 — Inisialisasi Git (kalau belum)

```cmd
cd D:\Projects\Claude\RyLis
git init
git add .
git commit -m "feat: initial RyLis website with 4 pillars + vision + vault"
```

## Step 2.2 — Verifikasi `.gitignore` sudah benar

Pastikan file `.gitignore` sudah include (sudah ada di project):
```
node_modules
.next
.env          ← penting! jangan commit secrets
*.db
dev-*.log
```

Cek dengan:
```cmd
git status
```
Pastikan **`.env` tidak muncul** di list.

## Step 2.3 — Bikin repo private di GitHub

**Opsi A — Pakai GitHub CLI (paling cepat):**

```cmd
gh auth login
gh repo create rylis --private --source=. --push
```

**Opsi B — Manual lewat web:**

1. Buka [github.com/new](https://github.com/new)
2. Repository name: `rylis`
3. **Private** ✓
4. **Tidak** centang "Add a README" (kita sudah punya)
5. Klik **Create repository**
6. Copy URL repo, lalu di terminal:
   ```cmd
   git remote add origin https://github.com/YOUR_USERNAME/rylis.git
   git branch -M main
   git push -u origin main
   ```

## Step 2.4 — Verifikasi

Buka `https://github.com/YOUR_USERNAME/rylis` → semua file ada **kecuali** `.env`, `node_modules`, `dev.db`.

---

# FASE 3 — Generate Secret untuk Production (2 menit)

## Step 3.1 — Generate AUTH_SECRET baru

Yang di `.env` itu cuma untuk dev. Production butuh secret baru yang panjang.

Di terminal (mana saja):
```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Output (contoh):
```
a7f9b2c1d8e6f3a5b9c2d4e7f1a8b5c3d6e9f2a4b7c1d8e5f3a6b9c2d4e7f1a8
```

Simpan — akan jadi `AUTH_SECRET` di Vercel.

## Step 3.2 — Tentukan VAULT_PASSCODE production

Ganti dari default `123456`. Pilih sesuatu yang:
- Mudah diingat berdua (mis. tanggal jadian / nama panggilan)
- Minimal 8 karakter
- **Jangan** sama dengan password Ryan/Lisa

Catat di tempat aman (mis. password manager).

---

# FASE 4 — Deploy ke Vercel (10 menit)

## Step 4.1 — Sign up Vercel

1. Buka [vercel.com/signup](https://vercel.com/signup)
2. **Continue with GitHub** → authorize Vercel
3. Pilih **Hobby plan** (free, cukup untuk RyLis)

## Step 4.2 — Import repo RyLis

1. Di Vercel dashboard → klik **Add New → Project**
2. Cari **rylis** di daftar repo → klik **Import**
3. **Configure Project** screen muncul:
   - **Framework Preset**: Next.js (auto-detected) ✓
   - **Root Directory**: `./` (default) ✓
   - **Build Command**: `npm run build` (default) ✓
   - **Output Directory**: (kosongkan, default) ✓
   - **Install Command**: `npm install` (default) ✓
4. **JANGAN klik Deploy dulu!** Expand bagian **Environment Variables** di bawah.

## Step 4.3 — Set Environment Variables

Tambahkan satu per satu (atau paste sebagai bulk pakai tombol **Paste .env**):

| Name | Value | Environment |
|---|---|---|
| `DATABASE_URL` | (connection string dari Neon Step 1.1) | Production, Preview, Development |
| `AUTH_SECRET` | (hasil generate Step 3.1) | Production, Preview, Development |
| `VAULT_PASSCODE` | (yang kamu pilih Step 3.2) | Production, Preview, Development |
| `GOOGLE_DRIVE_API_KEY` | (kosongkan dulu, di-set di Fase 6) | Production |

> Centang semua environment (Production/Preview/Development) untuk masing-masing variable kecuali yang spesifik production-only.

## Step 4.4 — Klik **Deploy**

Tunggu ~2 menit. Yang terjadi:
1. Vercel clone repo
2. `npm install` (install deps)
3. `prisma generate && prisma db push` (sync schema ke Neon)
4. `next build` (compile)
5. Deploy ke edge network

## Step 4.5 — Verifikasi deployment

Setelah selesai, Vercel kasih URL seperti:
```
https://rylis-xxx.vercel.app
```

1. Buka URL → halaman login muncul ✓
2. Login `ryan` / `ryan123` → dashboard muncul ✓
3. Coba tambah saat teduh / transaksi → cek apakah ke-save (refresh halaman, masih ada = berhasil)

---

# FASE 5 — Ganti Password Default (3 menit)

Default `ryan123` / `lisa123` tidak boleh dipakai di production!

## Step 5.1 — Bikin script ganti password

Buat file `scripts/change-password.ts`:

```ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const [, , loginId, newPassword] = process.argv;

if (!loginId || !newPassword) {
  console.error("Usage: tsx scripts/change-password.ts <loginId> <newPassword>");
  process.exit(1);
}

(async () => {
  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { loginId }, data: { passwordHash: hash } });
  console.log(`✓ Password for ${loginId} changed.`);
  await prisma.$disconnect();
})();
```

## Step 5.2 — Jalanin (akan update Neon karena DATABASE_URL sudah pointing ke prod)

```cmd
cd D:\Projects\Claude\RyLis
npx tsx scripts/change-password.ts ryan PasswordRahasiaRyan2026
npx tsx scripts/change-password.ts lisa PasswordRahasiaLisa2026
```

## Step 5.3 — Test login baru di production

Buka URL Vercel → login pakai password baru → harus berhasil.

---

# FASE 6 — Setup Google Drive (untuk Vision carousel) — Opsional (10 menit)

## Step 6.1 — Bikin Google Cloud Project

1. Buka [console.cloud.google.com](https://console.cloud.google.com)
2. Klik project selector di top bar → **New Project**
3. **Project name**: `rylis-app` → **Create**
4. Tunggu beberapa detik sampai project aktif → pilih project tersebut

## Step 6.2 — Enable Drive API

1. Sidebar kiri → **APIs & Services → Library**
2. Search: `Google Drive API`
3. Klik **Google Drive API** → **Enable**

## Step 6.3 — Bikin API Key

1. Sidebar → **APIs & Services → Credentials**
2. **+ Create Credentials → API key**
3. Pop-up muncul dengan key — copy
4. Klik **Edit API Key** untuk restrict:
   - **Application restrictions**: HTTP referrers (websites)
     - Add: `https://rylis-xxx.vercel.app/*`
     - Add: `https://your-custom-domain.com/*` (kalau punya)
     - Add: `http://localhost:4747/*` (untuk dev)
   - **API restrictions**: Restrict key → centang **Google Drive API**
5. **Save**

## Step 6.4 — Tambahkan ke Vercel

1. Vercel dashboard → project rylis → **Settings → Environment Variables**
2. Edit `GOOGLE_DRIVE_API_KEY` → paste API key dari Step 6.3
3. **Save**
4. **Penting**: trigger redeploy supaya env var aktif:
   - Tab **Deployments** → klik latest deployment → titik tiga → **Redeploy**

## Step 6.5 — Test

1. Bikin folder di Google Drive, isi 3-5 foto
2. Klik kanan folder → **Share → Anyone with the link → Viewer** → Copy link
3. Di RyLis: `/vision` → **+ Tambah Vision** → paste link → Simpan
4. Carousel langsung muncul dengan foto-foto folder ✓

---

# FASE 7 — Custom Domain (Opsional) (5 menit)

Kalau mau `rylis.app` instead of `rylis-xxx.vercel.app`:

## Step 7.1 — Beli domain

Recommend: [Namecheap](https://www.namecheap.com), [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/), atau [Niagahoster](https://www.niagahoster.co.id) (lokal Indonesia).

Domain `.app` ~Rp 200rb/tahun.

## Step 7.2 — Add domain di Vercel

1. Vercel → project → **Settings → Domains**
2. Input `rylis.app` (atau `app.rylis.com`, dll.) → **Add**
3. Vercel kasih instruksi DNS record yang harus di-set, biasanya:
   - Tipe `A` → `76.76.21.21`
   - atau tipe `CNAME` → `cname.vercel-dns.com`

## Step 7.3 — Set DNS di registrar

Login ke registrar → DNS management → tambah record sesuai instruksi Vercel.

Tunggu ~5-30 menit propagasi (kadang lebih cepat). Vercel akan auto-issue SSL certificate (HTTPS) saat domain aktif.

## Step 7.4 — Update Google Cloud allowed origins

Balik ke Step 6.3 → edit API key → tambah domain baru di HTTP referrers.

---

# FASE 8 — Lapisan Keamanan Tambahan (5 menit) — Recommended

Aplikasi sudah private (perlu login), tapi tambahan layer ini bikin lebih aman:

## Step 8.1 — Vercel Deployment Protection (Plus plan, $20/bulan)

Kalau mau ekstra: project lo butuh **password tambahan** sebelum bahkan bisa lihat login screen.

Vercel → **Settings → Deployment Protection → Vercel Authentication / Password Protection**.

> Kalau mau gratis: skip ini. Login screen RyLis sudah cukup proteksi untuk personal use.

## Step 8.2 — Aktifkan Vercel Web Analytics (gratis)

Vercel → project → **Analytics** tab → Enable.
Akan kasih insight kalau ada traffic mencurigakan.

## Step 8.3 — Set up monitoring email

Vercel → **Settings → Notifications** → Enable email untuk:
- Failed deployments
- Performance issues

---

# 🎉 SELESAI — Checklist Akhir

Sebelum dianggap "live":

- [ ] Database sudah di Neon Postgres (bukan SQLite)
- [ ] Code sudah di GitHub private
- [ ] AUTH_SECRET production sudah di-set (bukan default)
- [ ] VAULT_PASSCODE production sudah diganti
- [ ] Password Ryan & Lisa sudah diganti dari default
- [ ] Website bisa diakses di URL Vercel
- [ ] (Opsional) Google Drive integration jalan
- [ ] (Opsional) Custom domain aktif & SSL valid (cek 🔒 di address bar)
- [ ] Bookmark URL di HP berdua → siap dipakai harian!

---

# 🔄 Workflow setelah live

Setelah deploy pertama, update website ke production tinggal:

```cmd
cd D:\Projects\Claude\RyLis
# edit kode...
git add .
git commit -m "feat: tambah fitur X"
git push
```

Vercel akan **auto-deploy** dalam 1-2 menit setiap `git push` ke branch `main`. Tab **Deployments** di Vercel akan show progress real-time.

## Tips workflow

- **Preview deploy**: bikin branch `feature/xxx` → push → Vercel auto-bikin URL preview terpisah (`rylis-git-feature-xxx.vercel.app`). Bisa test sebelum merge ke main.
- **Rollback**: kalau ada deploy yang merusak, Vercel **Deployments → ... → Promote to Production** untuk balik ke deploy lama. Zero downtime.
- **Logs**: Vercel **Logs** tab → real-time log dari server actions / API routes. Berguna kalau ada error di production.

---

# 🆘 Troubleshooting umum

### "Error: Can't reach database server"
- Cek `DATABASE_URL` di Vercel env vars — pastikan ada `?sslmode=require` di akhir
- Neon free tier auto-suspend after idle — query pertama mungkin lambat (auto-wake)

### "Module not found: bcryptjs" saat build
- Pastikan `bcryptjs` ada di `dependencies` (bukan `devDependencies`) di `package.json` ✓ (sudah benar)

### "Prisma Client did not initialize yet"
- Build script harus include `prisma generate` ✓ (sudah ada di `package.json`)

### Drive carousel kosong
- Cek folder Drive sudah di-share "Anyone with the link"
- Cek API key di Vercel sudah di-set & sudah redeploy
- Cek HTTP referrer restriction di Google Cloud sudah include domain Vercel

### Login berhasil di lokal tapi gagal di production
- Beda `AUTH_SECRET` antara lokal & production — itu **normal & aman**. Session cookie dari lokal tidak valid di production, login ulang.

### Lupa password Ryan/Lisa
- Jalankan ulang `npx tsx scripts/change-password.ts ryan baru` (Step 5.2) — akan overwrite

---

Selamat live! 🌸 Kalau butuh bantuan lanjutan (mis. Google Calendar OAuth, PWA setup, AI insight) — lihat `GOING-LIVE.md` bagian Roadmap.
