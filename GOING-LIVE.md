# 🚀 RyLis — Plan Going Live & Integrasi

Dokumen ini menjelaskan **3 hal**:
1. Cara naik dari lokal → live (production)
2. Integrasi **Google Drive** (untuk Vision carousel)
3. Integrasi **Google Calendar** (sync 2-arah dengan kalender bersama)

---

## 0. Pilih Strategi Hosting

| Opsi | Cocok kalau… | Effort | Biaya/bulan |
|---|---|---|---|
| **Vercel + Vercel Postgres / Neon** (recommended) | Mau cepat, auto-deploy dari Git, built-in CDN, free tier cukup | ⭐ Mudah | $0 (hobby) |
| **Railway** | Suka all-in-one dashboard, gampang attach DB | ⭐ Mudah | ~$5 |
| **VPS (Hetzner / DO)** | Mau full control, sudah punya domain server | ⭐⭐⭐ Manual | ~$5–10 |
| **Self-host di rumah (Tailscale)** | Cuma kalian berdua, tidak perlu public URL | ⭐⭐ | $0 |

> **Rekomendasi**: Vercel + Neon Postgres. Free tier muat semua data RyLis untuk tahunan, deployment <2 menit per push, dan domain `rylis.app` bisa langsung disambungkan.

---

## 1. Migrasi SQLite → Postgres (sekali, sebelum live)

SQLite oke untuk dev tapi di Vercel serverless filesystem-nya **ephemeral** (data hilang tiap deploy). Pindah ke Postgres:

### Langkah
1. Buat database gratis di [Neon](https://neon.tech) atau Vercel Postgres.
2. Copy connection string-nya.
3. Edit `prisma/schema.prisma`:
   ```diff
   datasource db {
   -  provider = "sqlite"
   +  provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
4. Set `DATABASE_URL` di `.env` (lokal pakai Neon branch dev) & di Vercel env vars.
5. `npx prisma db push` lalu `npm run db:seed`.

> Tidak perlu ubah kode apa pun — semua field & query sudah portable.

---

## 2. Deploy ke Vercel

### A. Persiapan
1. Buat akun [Vercel](https://vercel.com) + install Vercel CLI: `npm i -g vercel`
2. Push repo ke GitHub (private!).
3. Di Vercel: **New Project** → import repo RyLis.

### B. Environment Variables (di Vercel Dashboard → Settings → Environment Variables)
| Variable | Value | Catatan |
|---|---|---|
| `DATABASE_URL` | postgres://… | dari Neon |
| `AUTH_SECRET` | random 64-char | `openssl rand -hex 32` |
| `VAULT_PASSCODE` | passcode rahasia | jangan pakai default `123456` |
| `GOOGLE_DRIVE_API_KEY` | dari Google Cloud Console | Step 3 |
| `GOOGLE_CLIENT_ID` | dari Google Cloud Console | Step 4 |
| `GOOGLE_CLIENT_SECRET` | dari Google Cloud Console | Step 4 |
| `GOOGLE_REDIRECT_URI` | `https://rylis.vercel.app/api/google/callback` | sesuaikan domain |

### C. Build script (sudah ada di `package.json`)
```json
"build": "prisma generate && prisma db push && next build"
```

### D. Setelah deploy berhasil
- Buka URL Vercel → halaman login muncul ✓
- Login Ryan/Lisa → seharusnya dashboard tampil
- **Custom domain**: Vercel → Settings → Domains → tambahkan `rylis.app` (atau apapun), arahkan A/CNAME record sesuai instruksi Vercel.

### E. Hardening sebelum benar-benar live
- [ ] Ganti `VAULT_PASSCODE` jadi sesuatu yang panjang
- [ ] Rotate password Ryan & Lisa (default `ryan123`/`lisa123` → ubah lewat Prisma Studio)
- [ ] Enable Vercel **Password Protection** untuk seluruh project (Project Settings → Deployment Protection) sebagai lapisan ekstra
- [ ] (Opsional) Aktifkan **Cloudflare Turnstile** di login page agar tahan brute-force

---

## 3. Integrasi Google Drive (Vision carousel)

### Tujuan
User paste link folder Drive → RyLis menampilkan semua gambar/video di folder itu sebagai carousel.

### Langkah-langkah

1. **Buat API Key (untuk membaca file public)**
   - Buka [Google Cloud Console](https://console.cloud.google.com)
   - Buat project baru: "RyLis"
   - **APIs & Services → Library** → cari **Google Drive API** → Enable
   - **APIs & Services → Credentials → Create Credentials → API Key**
   - Copy key → set sebagai `GOOGLE_DRIVE_API_KEY`
   - **Restrict** key:
     - HTTP referrers → `https://rylis.vercel.app/*` (dan `http://localhost:4747/*` untuk dev)
     - API restrictions → hanya **Google Drive API**

2. **Cara user share folder Drive**
   - Di Drive: klik kanan folder → **Share → Anyone with the link → Viewer**
   - Copy link, paste di form "Tambah Vision"
   - File harus berformat image/video; nama file disarankan `01_…`, `02_…` agar urutan carousel terjaga

3. **Cache image IDs**
   - Saat vision disimpan, RyLis langsung memanggil Drive API → simpan array of file IDs ke kolom `cachedImageIds`
   - Tombol **Refresh Drive** di setiap kartu vision memanggil ulang API kalau ada file baru ditambah
   - Carousel meload via `https://drive.google.com/thumbnail?id={ID}&sz=w1600` (gratis, no auth, cepat)

### Sudah dibuat di kode
- `src/lib/drive.ts` — parser link, fetch folder, thumbnail URL builder
- `src/app/(app)/vision/page.tsx` — server action `addVision` & `refreshVision` pakai lib di atas
- `src/app/(app)/vision/VisionCarousel.tsx` — UI client dengan auto-advance + dot navigation

### Limitations & Solusi
- API key gratis 1000 req/100 detik — cukup untuk kalian berdua
- Drive thumbnail hot-link bisa kena rate limit kalau di-embed publik — RyLis private, jadi aman
- Untuk file >1600px detail / RAW image → buat versi compressed terpisah di folder lain

---

## 4. Integrasi Google Calendar (sync 2-arah)

### Goal
- Event yang dibuat di RyLis → otomatis muncul di Google Calendar Ryan & Lisa
- Event di Google Calendar (mis. undangan teman, jadwal pasien Lisa) → muncul di RyLis

Field `googleEventId` di model `Event` **sudah ada** untuk menyimpan pointer ke event di Google Calendar.

### Strategi: OAuth 2.0 dengan Refresh Token (per user)

#### A. Setup OAuth (Google Cloud Console)
1. **APIs & Services → Library** → **Google Calendar API** → Enable
2. **OAuth consent screen** → External → isi nama "RyLis", email kalian, scope `.../auth/calendar.events`
3. **Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `http://localhost:4747/api/google/callback`
     - `https://rylis.vercel.app/api/google/callback`
4. Copy **Client ID** + **Client Secret** → set sebagai env vars

#### B. Tambahkan model untuk simpan token (Prisma)
```prisma
model GoogleConnection {
  userId       String   @id
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken  String
  refreshToken String
  expiresAt    DateTime
  calendarId   String   @default("primary")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

#### C. Route yang perlu dibuat (cetak biru — belum dibuat)
| Route | Fungsi |
|---|---|
| `GET /api/google/connect` | redirect ke Google OAuth consent (state = userId) |
| `GET /api/google/callback` | terima `code`, tukar jadi access+refresh token, simpan ke `GoogleConnection` |
| `POST /api/google/disconnect` | hapus token |
| Saat `POST /api/events` | kalau user ter-connect → buat event di Google, simpan `googleEventId` |
| Saat `PUT /api/events/:id` | update event di Google pakai `googleEventId` |
| Saat `DELETE /api/events/:id` | hapus event di Google juga |
| Cron `/api/cron/sync-google` (Vercel Cron, tiap 15 menit) | tarik event dari Google (channel watch / incremental sync token), upsert ke RyLis |

#### D. Library minimal
```bash
npm i googleapis
```
```ts
// src/lib/googleCalendar.ts (cetak biru)
import { google } from "googleapis";
export function oauthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}
export function calendarFor(tokens: { access_token: string; refresh_token: string }) {
  const c = oauthClient();
  c.setCredentials(tokens);
  return google.calendar({ version: "v3", auth: c });
}
```

#### E. Flow dari sisi user
1. Ryan masuk RyLis → **Settings → Connect Google Calendar** → consent Google
2. Sejak itu, semua event yang Ryan buat di RyLis muncul di Google Calendar pribadi (`primary`)
3. Lisa lakukan hal yang sama dengan akun Google-nya
4. Tiap event RyLis bisa **invite Lisa sebagai attendee** → Lisa dapat undangan di Google
5. Cron job 15-menit sekali narik event baru dari Google ke RyLis (incremental sync token; murah)

#### F. Considerations
- **Single source of truth**: anggap Google Calendar yang authoritative untuk waktu. Konflik (event diubah di kedua sisi sebelum sync) → pakai `updated` timestamp dari Google.
- **Timezone**: kirim ISO ke Google, biarkan Google handle timezone Asia/Jakarta.
- **Quota**: Calendar API gratis 1jt req/hari per project — aman.
- **Privacy**: scope `calendar.events` saja (jangan ambil `.readonly` full calendar list); minimal access.

---

## 5. Backup & Maintenance

| Apa | Bagaimana | Berapa sering |
|---|---|---|
| **DB backup** | Neon punya auto-backup harian (7 hari di free tier) — atau cron `pg_dump` ke S3 | Daily |
| **Code backup** | Sudah di GitHub | Auto |
| **Export pribadi** | Buat halaman `/export` yang download semua data RyLis sebagai JSON (privacy escape hatch) | On-demand |
| **Update deps** | `npx npm-check-updates -u` + test build | Tiap 2 bulan |

---

## 6. Roadmap setelah live

Prioritas (sesuaikan dengan kebutuhan kalian):

1. **Google Calendar sync** ← biggest win, sudah ada cetak birunya di atas
2. **Mobile PWA** — tambahkan `manifest.json` + service worker → install ke home screen iPhone/Android
3. **Notifikasi**:
   - Email harian "Jurnal hari ini?" via Resend (gratis 100 email/hari)
   - Reminder mezbah keluarga (mis. tiap Selasa 19.30) via Vercel Cron + email
4. **AI Insight** (opsional):
   - "Ringkasan jurnal minggu ini" pakai Claude API → highlight pola emosi
   - "Insight bacaan Alkitab minggu ini" → koneksi antar passage yang Ryan baca
5. **Budget auto-categorize** — paste statement BCA/Jenius → auto split per kategori
6. **Foto memori bersama** — drag-drop ke `/memories`, simpan di Vercel Blob, timeline view

---

## TL;DR — Ringkas 30 menit ke live

```bash
# 1. Pindah ke Postgres
# - bikin DB di neon.tech, copy URL
# Edit prisma/schema.prisma: provider = "postgresql"

# 2. Push ke GitHub (private)
git init && git add . && git commit -m "init"
gh repo create rylis --private --source=. --push

# 3. Deploy ke Vercel
vercel --prod
# (set env vars di dashboard, lihat tabel di atas)

# 4. Login → dashboard ✓
# 5. Settings → Connect Google Calendar (setelah implement OAuth flow)
```

Selamat berdampak global, RyLis 💞
