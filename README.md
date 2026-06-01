# 💞 RyLis — Ryan & Lisa Family OS

Productivity, relationship, and shared resources untuk keluarga RyLis.

## 4 Pillars
- 🙏 **Spiritual** — saat teduh, mezbah keluarga, rekomendasi pertumbuhan rohani
- 🧠 **Mental** — journaling harian (mood, emosi, refleksi, gratitude)
- 💪 **Fisik** — log latihan, jadwal olahraga, milestone & goal
- 💰 **Finansial** — income/expense, budget bulanan, aset, financial planning

## Fitur Pendukung
- 📆 **Kalender Bersama** (gaya Google Calendar — day/week/month + mini month)
- 🔗 **Important Links** — bookmark bersama dengan kategori
- 🔐 **Account Vault** — username/password akun bersama, dibuka pakai passcode (15 menit)
- 🎲 **Board Games** — koleksi/wishlist Ryan

## Cara jalanin (Windows)

```cmd
cd D:\Projects\Claude\RyLis
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Buka http://localhost:4747

**Login default:**
- Ryan: `ryan` / `ryan123`
- Lisa: `lisa` / `lisa123`

**Vault passcode:** `123456` (ubah di `.env` → `VAULT_PASSCODE`)

## Stack
- Next.js 15 (App Router) + React 19
- Prisma + SQLite (`dev.db` lokal)
- TailwindCSS
- Session: JWT (jose) di httpOnly cookie

## Catatan
- Kalender siap untuk ditambahkan integrasi Google Calendar — field `googleEventId` sudah ada di schema.
- Vault menyimpan password plaintext (sudah diproteksi passcode). Untuk produksi, sebaiknya enkripsi at-rest pakai key dari env.
- Aplikasi private — host sendiri di Vercel/Railway lalu lindungi dengan login screen yang sudah disediakan.
