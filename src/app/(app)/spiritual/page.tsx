import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { fmtDate, toInputDate } from "@/lib/fmt";
import { revalidatePath } from "next/cache";

const REKOMENDASI = [
  { t: "Renungan harian", d: "GMS Devotion / Our Daily Bread / YouVersion plan 1 tahun." },
  { t: "Worship pagi", d: "10 menit worship sebelum buka HP — set tone hari." },
  { t: "Mezbah keluarga rutin", d: "Sepakati 1 malam tetap (mis. Selasa 20.00) supaya konsisten." },
  { t: "Doa pasangan", d: "Sebelum tidur — saling sebut nama dalam doa, walau singkat." },
  { t: "Sermon GMS Yogya", d: "Catat 1 actionable point per Minggu, evaluasi minggu depan." },
];

export default async function SpiritualPage() {
  const s = await requireSession();

  const [myDevotions, altars] = await Promise.all([
    prisma.devotion.findMany({
      where: { userId: s.userId },
      orderBy: { date: "desc" },
      take: 15,
    }),
    prisma.familyAltar.findMany({
      orderBy: { date: "desc" },
      take: 10,
      include: { ledBy: true },
    }),
  ]);

  async function addDevotion(formData: FormData) {
    "use server";
    const ss = await requireSession();
    await prisma.devotion.create({
      data: {
        userId: ss.userId,
        date: new Date(String(formData.get("date"))),
        passage: String(formData.get("passage")),
        version: String(formData.get("version") || "TB"),
        insight: String(formData.get("insight")),
        prayer: String(formData.get("prayer") || "") || null,
        mood: String(formData.get("mood") || "") || null,
      },
    });
    revalidatePath("/spiritual");
  }

  async function addAltar(formData: FormData) {
    "use server";
    const ss = await requireSession();
    await prisma.familyAltar.create({
      data: {
        date: new Date(String(formData.get("date"))),
        ledById: ss.userId,
        passage: String(formData.get("passage")),
        topic: String(formData.get("topic")),
        notes: String(formData.get("notes")),
        prayerFor: String(formData.get("prayerFor") || "") || null,
      },
    });
    revalidatePath("/spiritual");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">🙏 Spiritual</h1>
        <p className="mt-1 text-sm text-slate-600">
          “Sebab itu bertekunlah … berdoalah setiap waktu” — Efesus 6:18. Tracking saat teduh, mezbah keluarga,
          dan pertumbuhan rohani kita berdua.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Saat Teduh form */}
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">📖 Catat Saat Teduh</h2>
          <form action={addDevotion} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Tanggal</label>
              <input type="date" name="date" defaultValue={toInputDate(new Date())} required className="input" />
            </div>
            <div>
              <label className="label">Ayat / Bacaan</label>
              <input name="passage" required placeholder="Mazmur 23:1-6" className="input" />
            </div>
            <div>
              <label className="label">Versi Alkitab</label>
              <input name="version" defaultValue="TB" className="input" />
            </div>
            <div>
              <label className="label">Mood</label>
              <input name="mood" placeholder="🔥 / 😊 / 😔" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Insight / Apa yang Tuhan bicarakan</label>
              <textarea name="insight" required rows={3} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Doa Respon</label>
              <textarea name="prayer" rows={2} className="input" />
            </div>
            <div className="sm:col-span-2">
              <button className="btn-primary">Simpan</button>
            </div>
          </form>
        </section>

        {/* Recommendations */}
        <aside className="card p-5">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">🌿 Rekomendasi</h2>
          <ul className="space-y-3 text-sm">
            {REKOMENDASI.map((r) => (
              <li key={r.t}>
                <p className="font-medium text-slate-800">{r.t}</p>
                <p className="text-slate-600">{r.d}</p>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* History */}
      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Saat Teduh Terakhir ({s.name})</h2>
        {myDevotions.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada catatan. Mulai sekarang yuk.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {myDevotions.map((d) => (
              <li key={d.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{d.passage} {d.mood && <span>{d.mood}</span>}</p>
                  <span className="text-xs text-slate-500">{fmtDate(d.date)}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{d.insight}</p>
                {d.prayer && <p className="mt-1 text-xs italic text-slate-500">🙏 {d.prayer}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Family Altar */}
      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">🕯️ Mezbah Keluarga</h2>
        <form action={addAltar} className="mb-5 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Tanggal</label>
            <input type="date" name="date" defaultValue={toInputDate(new Date())} required className="input" />
          </div>
          <div>
            <label className="label">Topik</label>
            <input name="topic" required placeholder="Hidup berbuah" className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Bacaan</label>
            <input name="passage" required placeholder="Yohanes 15:1-8" className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Catatan</label>
            <textarea name="notes" rows={3} required className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Pokok Doa</label>
            <textarea name="prayerFor" rows={2} className="input" />
          </div>
          <div>
            <button className="btn-primary">Simpan Mezbah</button>
          </div>
        </form>

        {altars.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada mezbah tercatat.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {altars.map((a) => (
              <li key={a.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{a.topic} — <span className="font-normal text-slate-600">{a.passage}</span></p>
                  <span className="text-xs text-slate-500">{fmtDate(a.date)} · dipimpin {a.ledBy.emoji} {a.ledBy.name}</span>
                </div>
                <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{a.notes}</p>
                {a.prayerFor && <p className="mt-1 text-xs italic text-slate-500">🙏 {a.prayerFor}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
