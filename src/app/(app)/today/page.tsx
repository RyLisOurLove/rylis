import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { fmtDate, idr } from "@/lib/fmt";
import Link from "next/link";

const PILLAR_META: Record<string, { emoji: string; color: string }> = {
  spiritual: { emoji: "🙏", color: "bg-amber-100 text-amber-700" },
  mental: { emoji: "🧠", color: "bg-sky-100 text-sky-700" },
  fisik: { emoji: "💪", color: "bg-emerald-100 text-emerald-700" },
  finansial: { emoji: "💰", color: "bg-violet-100 text-violet-700" },
  revenue: { emoji: "📈", color: "bg-rose-100 text-rose-700" },
  family: { emoji: "💞", color: "bg-pink-100 text-pink-700" },
  personal: { emoji: "✨", color: "bg-fuchsia-100 text-fuchsia-700" },
};

export default async function TodayPage() {
  const s = await requireSession();
  const now = new Date();
  const today = new Date(now.toDateString());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    phase,
    priorities,
    yesterdayPrio,
    upcoming,
    pipeline,
    monthTxns,
    journalToday,
    devotionToday,
    workoutsThisWeek,
    todayLogs,
  ] = await Promise.all([
    prisma.lifePhase.findFirst({ where: { active: true } }),
    prisma.priority.findMany({
      where: { userId: s.userId, date: { gte: today, lt: tomorrow } },
      orderBy: { rank: "asc" },
    }),
    prisma.priority.findMany({
      where: { userId: s.userId, date: { gte: yesterday, lt: today } },
    }),
    prisma.event.findMany({
      where: { startAt: { gte: now, lt: tomorrow } },
      orderBy: { startAt: "asc" },
      include: { attendees: { include: { user: true } } },
    }),
    prisma.opportunity.findMany({
      where: { stage: { in: ["lead", "qualified", "proposal", "negotiation"] } },
    }),
    prisma.transaction.findMany({ where: { date: { gte: monthStart, lt: nextMonth } } }),
    prisma.journalEntry.findFirst({
      where: { userId: s.userId, date: { gte: today } },
    }),
    prisma.devotion.findFirst({
      where: { userId: s.userId, date: { gte: today } },
    }),
    prisma.workoutLog.count({
      where: { userId: s.userId, date: { gte: weekAgo } },
    }),
    prisma.dailyLog.findMany({
      where: { userId: s.userId, date: { gte: today, lt: tomorrow } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const income = monthTxns.filter((t) => t.kind === "income").reduce((a, b) => a + b.amount, 0);
  const stale = pipeline.filter((o) => {
    if (o.nextActionAt && new Date(o.nextActionAt) < now) return true;
    if (!o.nextActionAt && (now.getTime() - new Date(o.updatedAt).getTime()) / 86400000 > 5) return true;
    return false;
  });
  const monthDay = now.getDate();
  const monthLen = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const monthProgress = Math.round((monthDay / monthLen) * 100);
  const incomePct = phase?.incomeTargetIdr
    ? Math.round((income / phase.incomeTargetIdr) * 100)
    : null;

  // Smart suggestions — deterministic, no AI needed
  const suggestions: string[] = [];
  if (!phase) suggestions.push("Set Life Phase agar agent kontekstual. Buka /phase.");
  if (priorities.length === 0) suggestions.push("Belum set top 3 prioritas. Gunakan form di bawah atau tanya Claude.");
  if (incomePct !== null && incomePct < monthProgress - 10)
    suggestions.push(`Revenue lagging: ${incomePct}% target di hari ke-${monthDay}/${monthLen}. Push pipeline atau cari opportunity baru.`);
  if (stale.length > 0) suggestions.push(`${stale.length} opportunity stale: ${stale.slice(0, 2).map(o => o.title).join(", ")}.`);
  if (!devotionToday) suggestions.push("Belum saat teduh hari ini.");
  if (!journalToday && now.getHours() >= 19) suggestions.push("Sudah malam — saatnya journal hari ini.");
  if (workoutsThisWeek < 2 && now.getDay() >= 4) suggestions.push(`Baru ${workoutsThisWeek}× olahraga minggu ini. Sisipkan sesi singkat.`);
  const yIncomplete = yesterdayPrio.filter((p) => !p.done);
  if (yIncomplete.length > 0)
    suggestions.push(`${yIncomplete.length} prioritas kemarin belum selesai: "${yIncomplete[0].title}". Carry over?`);

  async function setPriorities(formData: FormData) {
    "use server";
    const ss = await requireSession();
    const today = new Date(new Date().toDateString());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await prisma.priority.deleteMany({
      where: { userId: ss.userId, date: { gte: today, lt: tomorrow } },
    });
    for (let i = 1; i <= 3; i++) {
      const title = String(formData.get(`title${i}`) || "").trim();
      if (!title) continue;
      const pillar = String(formData.get(`pillar${i}`) || "personal");
      await prisma.priority.create({
        data: { userId: ss.userId, date: today, rank: i, title, pillar },
      });
    }
    revalidatePath("/today");
  }

  async function togglePriority(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const p = await prisma.priority.findUnique({ where: { id } });
    if (p) {
      await prisma.priority.update({
        where: { id },
        data: { done: !p.done, doneAt: !p.done ? new Date() : null },
      });
    }
    revalidatePath("/today");
  }

  async function addLog(formData: FormData) {
    "use server";
    const ss = await requireSession();
    await prisma.dailyLog.create({
      data: {
        userId: ss.userId,
        date: new Date(),
        kind: String(formData.get("kind") || "note"),
        title: String(formData.get("title")),
        body: String(formData.get("body") || ""),
        tag: String(formData.get("tag") || "") || null,
      },
    });
    revalidatePath("/today");
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs uppercase tracking-wider text-slate-500">
          {now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          {" · "}
          {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          Hari ini, {s.emoji} {s.name}
        </h1>
        {phase && (
          <p className="mt-1 text-sm text-slate-600">
            Fase: <Link href="/phase" className="font-medium text-brand-700 hover:underline">{phase.name}</Link>
            {phase.incomeTargetIdr && (
              <>
                {" · "}target {idr(phase.incomeTargetIdr)}{incomePct !== null && (
                  <span className={incomePct >= monthProgress ? "text-emerald-600" : "text-rose-600"}> ({incomePct}%)</span>
                )}
              </>
            )}
          </p>
        )}
      </header>

      {/* Smart suggestions */}
      {suggestions.length > 0 && (
        <section className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-violet-50 p-5">
          <h2 className="mb-2 text-sm font-semibold text-brand-800">💡 Insight hari ini</h2>
          <ul className="space-y-1 text-sm text-slate-800">
            {suggestions.map((s, i) => (
              <li key={i}>· {s}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Priorities */}
        <section className="card p-5">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">🎯 Top 3 Prioritas Hari Ini</h2>
          {priorities.length === 0 ? (
            <form action={setPriorities} className="space-y-2">
              <p className="mb-2 text-xs text-slate-500">
                Tulis maksimal 3. Pilih satu yang paling bergerakkan revenue, satu yang menjaga 4 pillar, satu yang menyegarkan diri.
              </p>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-2">
                  <input
                    name={`title${i}`}
                    placeholder={`#${i} — ${i === 1 ? "biggest needle mover" : i === 2 ? "pillar maintenance" : "refresh / personal"}`}
                    className="input flex-1"
                  />
                  <select name={`pillar${i}`} className="input !w-32" defaultValue={i === 1 ? "revenue" : i === 2 ? "spiritual" : "personal"}>
                    <option value="revenue">📈 Revenue</option>
                    <option value="spiritual">🙏 Spiritual</option>
                    <option value="mental">🧠 Mental</option>
                    <option value="fisik">💪 Fisik</option>
                    <option value="finansial">💰 Finansial</option>
                    <option value="family">💞 Family</option>
                    <option value="personal">✨ Personal</option>
                  </select>
                </div>
              ))}
              <button className="btn-primary mt-2">Set prioritas</button>
            </form>
          ) : (
            <ul className="space-y-2">
              {priorities.map((p) => {
                const m = PILLAR_META[p.pillar] || PILLAR_META.personal;
                return (
                  <li key={p.id} className="flex items-start gap-3">
                    <form action={togglePriority}>
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border ${p.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"}`}
                      >
                        {p.done ? "✓" : ""}
                      </button>
                    </form>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${p.done ? "text-slate-400 line-through" : "text-slate-900"}`}>
                        <span className="mr-1 text-xs text-slate-400">#{p.rank}</span>
                        {p.title}
                      </p>
                      <span className={`pill mt-1 ${m.color}`}>{m.emoji} {p.pillar}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Agenda hari ini */}
        <section className="card p-5">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">📆 Agenda Hari Ini</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">Tidak ada agenda hari ini.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-2.5">
                  <div className="flex h-10 w-12 flex-col items-center justify-center rounded-md bg-brand-50 text-brand-700">
                    <span className="text-[9px] uppercase">{new Date(e.startAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{e.title}</p>
                    <p className="text-[11px] text-slate-500">
                      {e.location || ""}
                      {e.attendees.length > 0 ? ` · ${e.attendees.map(a => a.user.emoji).join(" ")}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/calendar" className="mt-3 inline-block text-xs text-brand-700 hover:underline">
            Lihat kalender penuh →
          </Link>
        </section>

        {/* Pipeline snapshot */}
        <section className="card p-5">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">📊 Pipeline Snapshot</h2>
          <p className="text-xs text-slate-500">
            {pipeline.length} open · Forecast {idr(pipeline.reduce((a, o) => a + Math.round(o.estimatedValue * o.probability / 100), 0))}
          </p>
          {stale.length > 0 && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="text-xs font-semibold text-rose-800">⚠️ {stale.length} stale</p>
              <ul className="mt-1 space-y-0.5 text-xs text-rose-700">
                {stale.slice(0, 3).map((o) => (
                  <li key={o.id}>· {o.title} ({idr(o.estimatedValue)})</li>
                ))}
              </ul>
            </div>
          )}
          <Link href="/pipeline" className="mt-3 inline-block text-xs text-brand-700 hover:underline">
            Buka pipeline →
          </Link>
        </section>

        {/* Quick log */}
        <section className="card p-5">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">📝 Quick Log</h2>
          <form action={addLog} className="space-y-2">
            <div className="flex gap-2">
              <select name="kind" className="input !w-32">
                <option value="note">📒 Note</option>
                <option value="meeting">👥 Meeting</option>
                <option value="mom">📋 MoM</option>
                <option value="accomplishment">🏆 Win</option>
                <option value="blocker">🚧 Blocker</option>
                <option value="decision">🧭 Decision</option>
              </select>
              <input name="title" placeholder="Judul singkat" required className="input flex-1" />
            </div>
            <textarea name="body" rows={3} placeholder="Catatan lengkap..." className="input" />
            <input name="tag" placeholder="Tag (opsional)" className="input" />
            <button className="btn-primary">Simpan log</button>
          </form>

          {todayLogs.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500">Log hari ini ({todayLogs.length})</p>
              <ul className="mt-2 space-y-1 text-sm">
                {todayLogs.map((l) => (
                  <li key={l.id} className="rounded border border-slate-100 p-2">
                    <p className="text-[10px] text-slate-500">{l.kind} · {new Date(l.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</p>
                    <p className="text-sm font-medium text-slate-900">{l.title}</p>
                    {l.body && <p className="text-xs text-slate-600 whitespace-pre-wrap">{l.body}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      {/* Quick log shortcuts to pillars */}
      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">⚡ Quick Actions</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <QuickLink href="/spiritual" emoji="🙏" label="Catat saat teduh" done={!!devotionToday} />
          <QuickLink href="/mental" emoji="🧠" label="Journal harian" done={!!journalToday} />
          <QuickLink href="/fisik" emoji="💪" label="Log workout" />
          <QuickLink href="/finansial" emoji="💰" label="Catat transaksi" />
        </div>
      </section>
    </div>
  );
}

function QuickLink({ href, emoji, label, done }: { href: string; emoji: string; label: string; done?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition ${
        done ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      <span className="text-xl">{emoji}</span>
      <span className="flex-1">{label}</span>
      {done && <span className="text-xs">✓</span>}
    </Link>
  );
}
