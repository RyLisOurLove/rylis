import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { fmtDate, idr, toInputDate } from "@/lib/fmt";

const STAGES = [
  { key: "lead", label: "Lead", emoji: "🌱", tone: "bg-slate-100 text-slate-700" },
  { key: "qualified", label: "Qualified", emoji: "🔍", tone: "bg-sky-100 text-sky-700" },
  { key: "proposal", label: "Proposal", emoji: "📄", tone: "bg-violet-100 text-violet-700" },
  { key: "negotiation", label: "Nego", emoji: "🤝", tone: "bg-amber-100 text-amber-700" },
  { key: "won", label: "Won", emoji: "🏆", tone: "bg-emerald-100 text-emerald-700" },
  { key: "lost", label: "Lost", emoji: "💤", tone: "bg-rose-100 text-rose-700" },
];

export default async function PipelinePage() {
  await requireSession();

  const all = await prisma.opportunity.findMany({
    orderBy: [{ stage: "asc" }, { probability: "desc" }, { estimatedValue: "desc" }],
  });

  const open = all.filter((o) => !["won", "lost"].includes(o.stage));
  const won = all.filter((o) => o.stage === "won");
  const lost = all.filter((o) => o.stage === "lost");

  const forecast = open.reduce((a, o) => a + Math.round((o.estimatedValue * o.probability) / 100), 0);
  const pipelineValue = open.reduce((a, o) => a + o.estimatedValue, 0);
  const wonThisMonth = won
    .filter((o) => {
      if (!o.closedAt) return false;
      const d = new Date(o.closedAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((a, o) => a + o.estimatedValue, 0);

  const now = new Date();
  const stale = open.filter((o) => {
    if (o.nextActionAt && new Date(o.nextActionAt) < now) return true;
    if (!o.nextActionAt && (now.getTime() - new Date(o.updatedAt).getTime()) / 86400000 > 5) return true;
    return false;
  });

  async function add(formData: FormData) {
    "use server";
    await prisma.opportunity.create({
      data: {
        title: String(formData.get("title")),
        kind: String(formData.get("kind") || "lead"),
        ownerName: String(formData.get("owner") || "Ryan"),
        estimatedValue: Number(formData.get("estimatedValue") || 0),
        probability: Number(formData.get("probability") || 50),
        stage: String(formData.get("stage") || "lead"),
        source: String(formData.get("source") || "") || null,
        nextAction: String(formData.get("nextAction") || "") || null,
        nextActionAt: formData.get("nextActionAt") ? new Date(String(formData.get("nextActionAt"))) : null,
        contactName: String(formData.get("contactName") || "") || null,
        contactInfo: String(formData.get("contactInfo") || "") || null,
        notes: String(formData.get("notes") || "") || null,
      },
    });
    revalidatePath("/pipeline");
  }
  async function advance(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const newStage = String(formData.get("stage"));
    const data: Record<string, unknown> = { stage: newStage };
    if (newStage === "won" || newStage === "lost") {
      data.closedAt = new Date();
      data.closedAs = newStage;
    }
    await prisma.opportunity.update({ where: { id }, data });
    revalidatePath("/pipeline");
  }
  async function updateAction(formData: FormData) {
    "use server";
    await prisma.opportunity.update({
      where: { id: String(formData.get("id")) },
      data: {
        nextAction: String(formData.get("nextAction") || "") || null,
        nextActionAt: formData.get("nextActionAt") ? new Date(String(formData.get("nextActionAt"))) : null,
      },
    });
    revalidatePath("/pipeline");
  }
  async function del(formData: FormData) {
    "use server";
    await prisma.opportunity.delete({ where: { id: String(formData.get("id")) } });
    revalidatePath("/pipeline");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">📊 Opportunity Pipeline</h1>
        <p className="mt-1 text-sm text-slate-600">
          Setiap peluang revenue ada di sini. Jangan ada deal yang lupa di-follow up.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Forecast bulan ini" value={idr(forecast)} sub="prob × value" tone="violet" />
        <Stat label="Total pipeline value" value={idr(pipelineValue)} sub={`${open.length} open`} tone="emerald" />
        <Stat label="Won bulan ini" value={idr(wonThisMonth)} sub={`${won.filter(o => o.closedAt && new Date(o.closedAt).getMonth() === now.getMonth()).length} deals`} tone="emerald" />
        <Stat label="⚠️ Butuh follow-up" value={String(stale.length)} sub="action overdue" tone="rose" />
      </div>

      {stale.length > 0 && (
        <section className="card border-rose-200 bg-rose-50/40 p-5">
          <h2 className="mb-2 text-sm font-semibold text-rose-800">⚠️ Stale — pikirkan langkah berikutnya</h2>
          <ul className="space-y-1.5 text-sm">
            {stale.map((o) => (
              <li key={o.id} className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{o.title}</span>
                <span className="text-xs text-slate-500">
                  {o.nextAction ? `· ${o.nextAction}` : "· belum ada next action"}
                  {o.nextActionAt ? ` (due ${fmtDate(o.nextActionAt)})` : ""}
                </span>
                <span className="ml-auto text-xs text-slate-500">{idr(o.estimatedValue)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">+ Tambah Opportunity</h2>
        <form action={add} className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label">Judul</label>
            <input name="title" required placeholder="Branding Pak Budi Jasa Tour" className="input" />
          </div>
          <div>
            <label className="label">Tipe</label>
            <select name="kind" className="input">
              <option value="lead">Lead</option>
              <option value="proposal">Proposal</option>
              <option value="retainer">Retainer</option>
              <option value="product">Product</option>
            </select>
          </div>
          <div>
            <label className="label">Owner</label>
            <select name="owner" className="input">
              <option>Ryan</option>
              <option>Lisa</option>
              <option>Both</option>
            </select>
          </div>
          <div>
            <label className="label">Nilai estimasi (Rp)</label>
            <input type="number" name="estimatedValue" required className="input" />
          </div>
          <div>
            <label className="label">Probability %</label>
            <input type="number" name="probability" min={0} max={100} defaultValue={50} className="input" />
          </div>
          <div>
            <label className="label">Stage awal</label>
            <select name="stage" className="input">
              <option value="lead">Lead</option>
              <option value="qualified">Qualified</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
            </select>
          </div>
          <div>
            <label className="label">Source</label>
            <input name="source" placeholder="referral / inbound / outbound" className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Next action</label>
            <input name="nextAction" placeholder="Follow up via WA, kirim deck" className="input" />
          </div>
          <div>
            <label className="label">Due</label>
            <input type="date" name="nextActionAt" defaultValue={toInputDate(new Date(Date.now() + 3*86400000))} className="input" />
          </div>
          <div>
            <label className="label">Contact name</label>
            <input name="contactName" className="input" />
          </div>
          <div>
            <label className="label">Contact info</label>
            <input name="contactInfo" placeholder="WA 0812..." className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <input name="notes" className="input" />
          </div>
          <div className="sm:col-span-4">
            <button className="btn-primary">Simpan</button>
          </div>
        </form>
      </section>

      {STAGES.map((s) => {
        const items = all.filter((o) => o.stage === s.key);
        if (items.length === 0) return null;
        return (
          <section key={s.key} className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <span>{s.emoji}</span> {s.label}
              <span className="ml-2 text-xs font-normal text-slate-500">
                {items.length} · {idr(items.reduce((a, o) => a + o.estimatedValue, 0))}
              </span>
            </h2>
            <ul className="divide-y divide-slate-100">
              {items.map((o) => (
                <li key={o.id} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{o.title}</p>
                        <span className="pill bg-slate-100 text-slate-600">{o.ownerName}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {idr(o.estimatedValue)} · {o.probability}%
                        {o.contactName ? ` · ${o.contactName}` : ""}
                        {o.source ? ` · ${o.source}` : ""}
                      </p>
                      {o.nextAction && (
                        <p className="mt-1 text-sm text-slate-700">
                          → {o.nextAction}
                          {o.nextActionAt && (
                            <span className={`ml-1 text-xs ${new Date(o.nextActionAt) < now ? "font-semibold text-rose-600" : "text-slate-500"}`}>
                              ({fmtDate(o.nextActionAt)})
                            </span>
                          )}
                        </p>
                      )}
                      {o.notes && <p className="mt-1 text-xs italic text-slate-500">{o.notes}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <form action={advance} className="flex gap-1">
                        <input type="hidden" name="id" value={o.id} />
                        <select name="stage" defaultValue={o.stage} className="rounded border border-slate-200 px-2 py-1 text-xs">
                          {STAGES.map((st) => (
                            <option key={st.key} value={st.key}>{st.emoji} {st.label}</option>
                          ))}
                        </select>
                        <button className="btn-ghost !py-1 !text-xs">Move</button>
                      </form>
                      <form action={del}>
                        <input type="hidden" name="id" value={o.id} />
                        <button className="text-[10px] text-rose-600 hover:underline">Hapus</button>
                      </form>
                    </div>
                  </div>
                  {!["won", "lost"].includes(o.stage) && (
                    <form action={updateAction} className="mt-2 flex flex-wrap gap-2">
                      <input type="hidden" name="id" value={o.id} />
                      <input name="nextAction" defaultValue={o.nextAction || ""} placeholder="Next action..." className="input flex-1 !py-1 !text-xs" />
                      <input type="date" name="nextActionAt" defaultValue={o.nextActionAt ? toInputDate(o.nextActionAt) : ""} className="input !w-36 !py-1 !text-xs" />
                      <button className="btn-ghost !py-1 !text-xs">Update</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {lost.length > 0 && (
        <details className="card p-5">
          <summary className="cursor-pointer text-sm font-medium text-slate-600">
            Lihat {lost.length} lost opportunities (untuk learning)
          </summary>
          <ul className="mt-3 divide-y divide-slate-100">
            {lost.slice(0, 20).map((o) => (
              <li key={o.id} className="py-2 text-sm">
                <span className="line-through text-slate-500">{o.title}</span>
                <span className="ml-2 text-xs text-slate-400">{idr(o.estimatedValue)}</span>
                {o.closedNote && <p className="text-xs italic text-slate-500">{o.closedNote}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "violet" | "emerald" | "rose" }) {
  const map = {
    violet: "from-violet-100 to-fuchsia-50 text-violet-800",
    emerald: "from-emerald-100 to-teal-50 text-emerald-800",
    rose: "from-rose-100 to-pink-50 text-rose-800",
  } as const;
  return (
    <div className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${map[tone]} p-4`}>
      <p className="text-[11px] uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
      <p className="text-[10px] opacity-70">{sub}</p>
    </div>
  );
}
