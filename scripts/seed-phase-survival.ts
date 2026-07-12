/**
 * Seed fase pertama RyLis: "Survival Mode" (Juli 2026).
 * Sekaligus set budget bulanan Juli & Agustus 2026 + goal dana darurat.
 *
 * Jalankan: npx tsx scripts/seed-phase-survival.ts
 * (DATABASE_URL dari .env — saat ini menunjuk ke Neon production)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PHASE = {
  name: "Survival Mode — Bridging Income Gap",
  situation:
    "Pemasukan gabungan turun drastis mulai Agustus 2026: dari ±Rp 17 jt/bulan menjadi Rp 4,5 jt/bulan (fixed). " +
    "Juli ini membayar kontrakan rumah 2 tahun di muka, sehingga tabungan diperkirakan habis (mendekati Rp 0). " +
    "Pengeluaran tetap ±Rp 8,5 jt/bulan → defisit struktural ±Rp 4 jt/bulan yang harus ditutup secepatnya. " +
    "Lisa masih menempuh pendidikan profesi psikologi (belum berpenghasilan tetap).",
  currentWork:
    "- Ryan: creative agency — income fixed Rp 4,5 jt/bulan mulai Agustus\n" +
    "- Ryan: hunting side income / proyek lepas (target +Rp 4-8 jt/bulan)\n" +
    "- Lisa: mahasiswi psikologi profesi (fokus studi, belum income tetap)",
  goals:
    "1. Tutup gap kebutuhan bulanan: income tambahan ≥ Rp 4,5 jt/bulan dalam 60 hari (deadline akhir September)\n" +
    "2. Amankan sisa pemasukan Juli (bulan terakhir 17 jt) sebagai dana darurat awal\n" +
    "3. Audit & pangkas pengeluaran — target burn ≤ Rp 8,5 jt/bulan tanpa mengorbankan kesehatan\n" +
    "4. Bangun kembali dana darurat: Rp 9 jt (1 bulan) dalam 3 bulan, Rp 27 jt (3 bulan) dalam 12 bulan\n" +
    "5. Bangun minimal 1 sumber income recurring baru (retainer/produk) — bukan sekadar one-off",
  constraints:
    "- Ibadah & mezbah keluarga tetap jalan (jangan dikorbankan demi kerja)\n" +
    "- Jadwal & kebutuhan kuliah profesi Lisa tetap prioritas\n" +
    "- Kontrakan sudah dibayar 2 tahun — housing aman, leverage ketenangan ini\n" +
    "- Hindari utang konsumtif; kalau terpaksa hanya untuk kebutuhan produktif\n" +
    "- Asuransi kesehatan & perawatan gigi tidak dipotong",
  energyLevel: "medium",
  incomeTargetIdr: 13_000_000, // burn riil (~9jt) + rebuild dana darurat (~3jt) + buffer
  incomeFloorIdr: 9_000_000, // estimasi burn riil termasuk kategori tersembunyi
  fixedIncomeIdr: 4_500_000,
  notes:
    "Dicatat 12 Juli 2026. Angka pengeluaran masih estimasi — verifikasi lewat pencatatan transaksi 1-2 bulan pertama. " +
    "Kategori yang mungkin belum terhitung: persepuluhan/persembahan, transport & bensin, pulsa/data, " +
    "biaya kuliah Lisa, sosial/kado, kebutuhan rumah tangga, pajak kendaraan, dan tak terduga.",
};

// Budget kategori — angka dari Ryan, 12 Juli 2026.
const BUDGET_CATEGORIES: Array<[string, number]> = [
  ["Asuransi Kesehatan", 1_600_000],
  ["Perawatan Gigi", 400_000],
  ["Utilitas (Listrik, Air, Keamanan, WiFi)", 900_000],
  ["Pegangan Istri", 2_500_000],
  ["Makan", 2_500_000],
  ["Produktivitas & Apps", 600_000],
];

const MONTHS = ["2026-07", "2026-08"];

async function main() {
  // 1. Fase — nonaktifkan fase aktif lain (kalau ada), buat yang baru.
  const existing = await prisma.lifePhase.findFirst({ where: { name: PHASE.name } });
  if (existing) {
    console.log(`• Fase "${PHASE.name}" sudah ada — update konten.`);
    await prisma.lifePhase.update({ where: { id: existing.id }, data: { ...PHASE, active: true } });
  } else {
    await prisma.lifePhase.updateMany({
      where: { active: true },
      data: { active: false, endedAt: new Date() },
    });
    await prisma.lifePhase.create({ data: PHASE });
    console.log(`✓ Fase aktif: "${PHASE.name}"`);
  }

  // 2. Budget Juli + Agustus.
  for (const month of MONTHS) {
    for (const [category, limit] of BUDGET_CATEGORIES) {
      await prisma.budget.upsert({
        where: { month_category: { month, category } },
        update: { limit },
        create: { month, category, limit },
      });
    }
    console.log(`✓ Budget ${month}: ${BUDGET_CATEGORIES.length} kategori (total Rp ${BUDGET_CATEGORIES.reduce((a, [, v]) => a + v, 0).toLocaleString("id-ID")})`);
  }

  // 3. Goal dana darurat.
  const goalTitle = "Dana Darurat 3 Bulan";
  const goal = await prisma.financialGoal.findFirst({ where: { title: goalTitle } });
  if (!goal) {
    await prisma.financialGoal.create({
      data: {
        title: goalTitle,
        targetAmt: 27_000_000,
        currentAmt: 0,
        note: "Prioritas #1 setelah gap income tertutup. Milestone: Rp 9jt (1 bln) → Rp 18jt (2 bln) → Rp 27jt (3 bln).",
      },
    });
    console.log(`✓ Financial goal: "${goalTitle}" target Rp 27.000.000`);
  } else {
    console.log(`• Goal "${goalTitle}" sudah ada — skip.`);
  }

  console.log("\nSelesai. Buka /phase dan /finansial untuk melihat hasilnya.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
