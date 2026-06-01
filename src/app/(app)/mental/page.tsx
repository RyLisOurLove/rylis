import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { fmtDate, toInputDate } from "@/lib/fmt";
import { revalidatePath } from "next/cache";

const EMOSI_TAGS = [
  "grateful", "joyful", "calm", "loved",
  "anxious", "tired", "frustrated", "sad", "stressed", "lonely", "overwhelmed", "hopeful",
];

export default async function MentalPage() {
  const s = await requireSession();
  const entries = await prisma.journalEntry.findMany({
    where: { userId: s.userId },
    orderBy: { date: "desc" },
    take: 30,
  });

  const last7 = entries.slice(0, 7).reverse();
  const avg7 =
    last7.length > 0
      ? Math.round((last7.reduce((a, b) => a + b.moodScore, 0) / last7.length) * 10) / 10
      : null;

  async function add(formData: FormData) {
    "use server";
    const ss = await requireSession();
    const emotions = (formData.getAll("emotions") as string[]).join(",");
    await prisma.journalEntry.create({
      data: {
        userId: ss.userId,
        date: new Date(String(formData.get("date"))),
        moodScore: Number(formData.get("moodScore")),
        emotions,
        events: String(formData.get("events")),
        reflection: String(formData.get("reflection")),
        gratitude: String(formData.get("gratitude") || "") || null,
      },
    });
    revalidatePath("/mental");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">🧠 Mental</h1>
        <p className="mt-1 text-sm text-slate-600">
          Sebagai calon psikolog, kamu paling tahu — “name it to tame it.” Jurnal harian untuk keluar dari kepala.
        </p>
      </header>

      {/* Mood last 7 visual */}
      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Mood 7 Hari Terakhir</h2>
          {avg7 !== null && <span className="pill bg-brand-100 text-brand-700">Avg {avg7}/10</span>}
        </div>
        {last7.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada jurnal minggu ini.</p>
        ) : (
          <div className="flex h-32 items-end gap-2">
            {last7.map((e) => (
              <div key={e.id} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-brand-400 to-brand-200"
                  style={{ height: `${e.moodScore * 10}%` }}
                  title={`${e.moodScore}/10`}
                />
                <span className="text-[10px] text-slate-500">
                  {new Date(e.date).toLocaleDateString("id-ID", { weekday: "narrow" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* New entry */}
      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">📝 Journal Hari Ini</h2>
        <form action={add} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Tanggal</label>
            <input type="date" name="date" defaultValue={toInputDate(new Date())} required className="input" />
          </div>
          <div>
            <label className="label">Skor Mood (1-10)</label>
            <input type="number" name="moodScore" min={1} max={10} defaultValue={7} required className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Emosi yang dirasakan (boleh lebih dari satu)</label>
            <div className="flex flex-wrap gap-2">
              {EMOSI_TAGS.map((tag) => (
                <label key={tag} className="cursor-pointer">
                  <input type="checkbox" name="emotions" value={tag} className="peer sr-only" />
                  <span className="pill border border-slate-200 bg-white text-slate-600 peer-checked:border-brand-500 peer-checked:bg-brand-100 peer-checked:text-brand-700">
                    {tag}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Apa yang terjadi hari ini?</label>
            <textarea name="events" rows={3} required className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Refleksi / apa yang dipelajari?</label>
            <textarea name="reflection" rows={3} required className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">3 hal yang disyukuri (opsional)</label>
            <textarea name="gratitude" rows={2} placeholder="1. ...&#10;2. ...&#10;3. ..." className="input" />
          </div>
          <div className="sm:col-span-2">
            <button className="btn-primary">Simpan</button>
          </div>
        </form>
      </section>

      {/* History */}
      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Jurnal Sebelumnya</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada jurnal.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {entries.map((e) => (
              <li key={e.id} className="py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">
                    {fmtDate(e.date)} · Mood {e.moodScore}/10
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {e.emotions
                      .split(",")
                      .filter(Boolean)
                      .map((t) => (
                        <span key={t} className="pill bg-slate-100 text-slate-600">{t}</span>
                      ))}
                  </div>
                </div>
                <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap"><strong>Kejadian:</strong> {e.events}</p>
                <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap"><strong>Refleksi:</strong> {e.reflection}</p>
                {e.gratitude && <p className="mt-1 text-sm text-emerald-700 whitespace-pre-wrap">🌼 {e.gratitude}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
