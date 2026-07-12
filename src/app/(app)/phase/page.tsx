import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { fmtDate } from "@/lib/fmt";

export default async function PhasePage() {
  await requireSession();

  const [active, history] = await Promise.all([
    prisma.lifePhase.findFirst({ where: { active: true } }),
    prisma.lifePhase.findMany({
      where: { active: false },
      orderBy: { startedAt: "desc" },
      take: 10,
    }),
  ]);

  async function setPhase(formData: FormData) {
    "use server";
    await requireSession();
    // End all active phases
    await prisma.lifePhase.updateMany({
      where: { active: true },
      data: { active: false, endedAt: new Date() },
    });
    await prisma.lifePhase.create({
      data: {
        name: String(formData.get("name")),
        active: true,
        situation: String(formData.get("situation") || ""),
        currentWork: String(formData.get("currentWork") || ""),
        goals: String(formData.get("goals") || ""),
        constraints: String(formData.get("constraints") || ""),
        energyLevel: String(formData.get("energyLevel") || "medium"),
        incomeTargetIdr: formData.get("incomeTargetIdr") ? Number(formData.get("incomeTargetIdr")) : null,
        incomeFloorIdr: formData.get("incomeFloorIdr") ? Number(formData.get("incomeFloorIdr")) : null,
        fixedIncomeIdr: formData.get("fixedIncomeIdr") ? Number(formData.get("fixedIncomeIdr")) : null,
        notes: String(formData.get("notes") || "") || null,
      },
    });
    revalidatePath("/phase");
    revalidatePath("/");
    revalidatePath("/today");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">🌊 Life Phase</h1>
        <p className="mt-1 text-sm text-slate-600">
          Fase hidup yang sedang berjalan. Setiap saran agent — prioritas, jadwal, fokus —
          akan menyesuaikan konteks ini. Update kapan saja kondisi berubah signifikan.
        </p>
      </header>

      {active && (
        <section className="card overflow-hidden">
          <div className="bg-gradient-to-r from-brand-100 to-violet-100 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-brand-700">Fase aktif</p>
                <h2 className="text-2xl font-bold text-slate-900">{active.name}</h2>
                <p className="text-xs text-slate-600">Mulai {fmtDate(active.startedAt)} · energi {active.energyLevel}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Situasi" value={active.situation} />
            <Field label="Pekerjaan aktif" value={active.currentWork} />
            <Field label="Goals fase ini" value={active.goals} />
            <Field label="Constraints / non-negotiable" value={active.constraints} />
            {active.fixedIncomeIdr && (
              <Field label="Fixed income saat ini" value={`Rp ${active.fixedIncomeIdr.toLocaleString("id-ID")}`} />
            )}
            {active.incomeTargetIdr && (
              <Field label="Target income/bulan" value={`Rp ${active.incomeTargetIdr.toLocaleString("id-ID")}`} />
            )}
            {active.incomeFloorIdr && (
              <Field label="Income minimum" value={`Rp ${active.incomeFloorIdr.toLocaleString("id-ID")}`} />
            )}
            {active.notes && <Field label="Catatan" value={active.notes} />}
          </div>
        </section>
      )}

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          {active ? "Pindah ke Fase Baru" : "Mulai Fase Pertama"}
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          Pindah fase ketika: kehilangan/dapat pekerjaan baru, target income berubah signifikan,
          fase hidup berbeda (mis. fase persiapan menikah, fase parenting, fase rebuild dll).
        </p>
        <form action={setPhase} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nama fase</label>
            <input
              name="name"
              required
              placeholder="Contoh: Bridging — Cari side hustle setelah kehilangan klien retainer"
              className="input"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="label">Situasi sekarang (yang sedang terjadi)</label>
            <textarea
              name="situation"
              rows={3}
              placeholder="Contoh: Salah satu kerjaan utama saya berhenti per Mei. Income drop 60%. Ada tabungan untuk 2 bulan. Lisa masih kuliah PPK psikolog, belum bisa generate income besar."
              className="input"
            />
          </div>

          <div>
            <label className="label">Pekerjaan/proyek aktif</label>
            <textarea
              name="currentWork"
              rows={3}
              placeholder="Contoh:
- Creative agency (~20 jam/minggu, retainer 3 klien)
- Freelance video edit (~5 jam/minggu, on-demand)"
              className="input"
            />
          </div>

          <div>
            <label className="label">Goals fase ini (top 3-5)</label>
            <textarea
              name="goals"
              rows={3}
              placeholder="Contoh:
1. Replace lost income dalam 60 hari
2. Launch 1 produk digital (template Notion)
3. Bangun email list 200 subscribers"
              className="input"
            />
          </div>

          <div>
            <label className="label">Constraints / non-negotiable</label>
            <textarea
              name="constraints"
              rows={3}
              placeholder="Contoh:
- Mezbah keluarga Selasa malam wajib
- Pagi 06.00 saat teduh
- Sabtu off untuk Lisa
- Cap 6 jam screen time/hari"
              className="input"
            />
          </div>

          <div>
            <label className="label">Energy level baseline</label>
            <select name="energyLevel" defaultValue="medium" className="input">
              <option value="high">High — sanggup heavy lifting daily</option>
              <option value="medium">Medium — paced work, normal</option>
              <option value="low">Low — recovery mode, batasi commitment</option>
            </select>
          </div>

          <div>
            <label className="label">Fixed income saat ini (IDR/bulan)</label>
            <input type="number" name="fixedIncomeIdr" placeholder="4500000" className="input" />
          </div>

          <div>
            <label className="label">Target income/bulan (IDR)</label>
            <input type="number" name="incomeTargetIdr" placeholder="15000000" className="input" />
          </div>

          <div>
            <label className="label">Income floor (minimum bertahan)</label>
            <input type="number" name="incomeFloorIdr" placeholder="8000000" className="input" />
          </div>

          <div className="sm:col-span-2">
            <label className="label">Catatan bebas</label>
            <textarea name="notes" rows={2} className="input" />
          </div>

          <div className="sm:col-span-2">
            <button className="btn-primary">
              {active ? "Pindah fase (fase aktif akan diarsipkan)" : "Set fase aktif"}
            </button>
          </div>
        </form>
      </section>

      {history.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Riwayat Fase</h2>
          <ul className="divide-y divide-slate-100">
            {history.map((p) => (
              <li key={p.id} className="py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                  <span className="text-xs text-slate-500">
                    {fmtDate(p.startedAt)} → {p.endedAt ? fmtDate(p.endedAt) : "—"}
                  </span>
                </div>
                {p.situation && <p className="mt-1 text-xs text-slate-600 line-clamp-2">{p.situation}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{value || "—"}</p>
    </div>
  );
}
