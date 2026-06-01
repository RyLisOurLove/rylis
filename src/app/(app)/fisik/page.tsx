import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { fmtDate, toInputDate } from "@/lib/fmt";
import { revalidatePath } from "next/cache";

export default async function FisikPage() {
  const s = await requireSession();
  const [logs, goals] = await Promise.all([
    prisma.workoutLog.findMany({
      where: { userId: s.userId },
      orderBy: { date: "desc" },
      take: 20,
    }),
    prisma.fitnessGoal.findMany({ orderBy: [{ done: "asc" }, { createdAt: "desc" }] }),
  ]);

  const last30 = await prisma.workoutLog.count({
    where: { userId: s.userId, date: { gte: new Date(Date.now() - 30 * 86400000) } },
  });
  const minutesTotal = logs.reduce((a, b) => a + b.duration, 0);

  async function addLog(formData: FormData) {
    "use server";
    const ss = await requireSession();
    await prisma.workoutLog.create({
      data: {
        userId: ss.userId,
        date: new Date(String(formData.get("date"))),
        type: String(formData.get("type")),
        duration: Number(formData.get("duration")),
        intensity: String(formData.get("intensity")),
        notes: String(formData.get("notes") || "") || null,
      },
    });
    revalidatePath("/fisik");
  }
  async function addGoal(formData: FormData) {
    "use server";
    await prisma.fitnessGoal.create({
      data: {
        ownerName: String(formData.get("ownerName")),
        title: String(formData.get("title")),
        target: String(formData.get("target")),
        deadline: formData.get("deadline") ? new Date(String(formData.get("deadline"))) : null,
        progress: 0,
      },
    });
    revalidatePath("/fisik");
  }
  async function toggleGoal(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const g = await prisma.fitnessGoal.findUnique({ where: { id } });
    if (g) await prisma.fitnessGoal.update({ where: { id }, data: { done: !g.done, progress: !g.done ? 100 : g.progress } });
    revalidatePath("/fisik");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">💪 Fisik</h1>
        <p className="mt-1 text-sm text-slate-600">
          Tubuh yang sehat melayani jiwa yang sehat. Catat latihan, milestone, dan saling support.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Sesi 30 hari" value={`${last30}×`} />
        <Stat label="Total menit (riwayat)" value={`${minutesTotal}'`} />
        <Stat label="Goal aktif" value={`${goals.filter((g) => !g.done).length}`} />
        <Stat label="Goal tercapai" value={`${goals.filter((g) => g.done).length}`} />
      </div>

      {/* Log */}
      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">🏋️ Catat Latihan</h2>
        <form action={addLog} className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Tanggal</label>
            <input type="date" name="date" defaultValue={toInputDate(new Date())} required className="input" />
          </div>
          <div>
            <label className="label">Jenis</label>
            <input name="type" required placeholder="Gym / Running / Yoga" className="input" />
          </div>
          <div>
            <label className="label">Durasi (menit)</label>
            <input type="number" name="duration" min={1} defaultValue={30} required className="input" />
          </div>
          <div>
            <label className="label">Intensitas</label>
            <select name="intensity" className="input" defaultValue="medium">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Catatan</label>
            <input name="notes" placeholder="Bench 5x5 @ 50kg" className="input" />
          </div>
          <div className="sm:col-span-3">
            <button className="btn-primary">Simpan</button>
          </div>
        </form>
      </section>

      {/* Goals */}
      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">🎯 Milestone & Goal</h2>
        <form action={addGoal} className="mb-4 grid gap-3 sm:grid-cols-4">
          <div>
            <label className="label">Pemilik</label>
            <select name="ownerName" className="input">
              <option>Ryan</option>
              <option>Lisa</option>
              <option>Both</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Judul</label>
            <input name="title" required placeholder="Lari 5K" className="input" />
          </div>
          <div>
            <label className="label">Deadline</label>
            <input type="date" name="deadline" className="input" />
          </div>
          <div className="sm:col-span-4">
            <label className="label">Target spesifik</label>
            <input name="target" required placeholder="Sub-30 menit" className="input" />
          </div>
          <div>
            <button className="btn-primary">Tambah goal</button>
          </div>
        </form>

        <ul className="divide-y divide-slate-100">
          {goals.map((g) => (
            <li key={g.id} className="flex items-center gap-3 py-3">
              <form action={toggleGoal}>
                <input type="hidden" name="id" value={g.id} />
                <button
                  className={`flex h-6 w-6 items-center justify-center rounded-full border ${g.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"}`}
                >
                  {g.done ? "✓" : ""}
                </button>
              </form>
              <div className="flex-1">
                <p className={`text-sm font-medium ${g.done ? "text-slate-400 line-through" : "text-slate-900"}`}>
                  {g.title} <span className="text-xs text-slate-500">· {g.ownerName}</span>
                </p>
                <p className="text-xs text-slate-500">{g.target}{g.deadline ? ` · target ${fmtDate(g.deadline)}` : ""}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* History */}
      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Riwayat Latihan</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada latihan.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{l.type} · {l.duration} menit</p>
                  <p className="text-xs text-slate-500">{fmtDate(l.date)} · intensitas {l.intensity}</p>
                  {l.notes && <p className="mt-0.5 text-sm text-slate-600">{l.notes}</p>}
                </div>
                <span className={`pill ${l.intensity === "high" ? "bg-rose-100 text-rose-700" : l.intensity === "medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                  {l.intensity}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
