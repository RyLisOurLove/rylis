import Link from "next/link";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { fmtDate, idr, monthKey, toInputDate } from "@/lib/fmt";
import { revalidatePath } from "next/cache";

export default async function FinansialPage() {
  await requireSession();
  const mk = monthKey(new Date());
  const startOfMonth = new Date(`${mk}-01T00:00:00`);

  const [txns, budgets, assets, goals, allTxns, phase] = await Promise.all([
    prisma.transaction.findMany({
      where: { date: { gte: startOfMonth } },
      orderBy: { date: "desc" },
      include: { user: true },
    }),
    prisma.budget.findMany({ where: { month: mk }, orderBy: { category: "asc" } }),
    prisma.asset.findMany({ orderBy: { value: "desc" } }),
    prisma.financialGoal.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.transaction.findMany({ orderBy: { date: "desc" }, take: 20, include: { user: true } }),
    prisma.lifePhase.findFirst({ where: { active: true } }),
  ]);

  const income = txns.filter((t) => t.kind === "income").reduce((a, b) => a + b.amount, 0);
  const expense = txns.filter((t) => t.kind === "expense").reduce((a, b) => a + b.amount, 0);
  const net = income - expense;
  const totalAssets = assets.reduce((a, b) => a + b.value, 0);

  // Survival projection — driven by Life Phase fixed income vs planned burn.
  const plannedBurn = budgets.reduce((a, b) => a + b.limit, 0);
  const liquidAssets = assets
    .filter((a) => a.kind === "cash" || a.kind === "investment")
    .reduce((a, b) => a + b.value, 0);
  const fixedIncome = phase?.fixedIncomeIdr ?? null;
  const monthlyGap = fixedIncome !== null && plannedBurn > 0 ? fixedIncome - plannedBurn : null;
  const runwayMonths =
    monthlyGap !== null && monthlyGap < 0 && liquidAssets > 0
      ? Math.round((liquidAssets / -monthlyGap) * 10) / 10
      : null;

  // budget spending by category this month
  const spentByCat = txns
    .filter((t) => t.kind === "expense")
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  async function addTxn(formData: FormData) {
    "use server";
    const ss = await requireSession();
    await prisma.transaction.create({
      data: {
        userId: ss.userId,
        date: new Date(String(formData.get("date"))),
        kind: String(formData.get("kind")),
        category: String(formData.get("category")),
        amount: Number(formData.get("amount")),
        description: String(formData.get("description")),
        account: String(formData.get("account") || "") || null,
      },
    });
    revalidatePath("/finansial");
  }
  async function addBudget(formData: FormData) {
    "use server";
    const month = String(formData.get("month"));
    const category = String(formData.get("category"));
    const limit = Number(formData.get("limit"));
    await prisma.budget.upsert({
      where: { month_category: { month, category } },
      update: { limit },
      create: { month, category, limit },
    });
    revalidatePath("/finansial");
  }
  async function delBudget(formData: FormData) {
    "use server";
    await prisma.budget.delete({ where: { id: String(formData.get("id")) } });
    revalidatePath("/finansial");
  }
  async function addAsset(formData: FormData) {
    "use server";
    await prisma.asset.create({
      data: {
        name: String(formData.get("name")),
        kind: String(formData.get("kind")),
        value: Number(formData.get("value")),
        note: String(formData.get("note") || "") || null,
      },
    });
    revalidatePath("/finansial");
  }
  async function updateAsset(formData: FormData) {
    "use server";
    await prisma.asset.update({
      where: { id: String(formData.get("id")) },
      data: { value: Number(formData.get("value")) },
    });
    revalidatePath("/finansial");
  }
  async function addGoal(formData: FormData) {
    "use server";
    await prisma.financialGoal.create({
      data: {
        title: String(formData.get("title")),
        targetAmt: Number(formData.get("targetAmt")),
        currentAmt: Number(formData.get("currentAmt") || 0),
        deadline: formData.get("deadline") ? new Date(String(formData.get("deadline"))) : null,
        note: String(formData.get("note") || "") || null,
      },
    });
    revalidatePath("/finansial");
  }
  async function updateGoal(formData: FormData) {
    "use server";
    await prisma.financialGoal.update({
      where: { id: String(formData.get("id")) },
      data: { currentAmt: Number(formData.get("currentAmt")) },
    });
    revalidatePath("/finansial");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">💰 Finansial</h1>
        <p className="mt-1 text-sm text-slate-600">
          Penatalayanan bersama — pemasukan, pengeluaran, budget, aset, dan rencana ke depan.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={`Income (${mk})`} value={idr(income)} tone="emerald" />
        <Stat label={`Expense (${mk})`} value={idr(expense)} tone="rose" />
        <Stat label="Net cashflow" value={idr(net)} tone={net >= 0 ? "emerald" : "rose"} />
        <Stat label="Total aset" value={idr(totalAssets)} tone="violet" />
      </div>

      {/* Survival projection — visible whenever a Life Phase is set */}
      {phase && (
        <section className="card overflow-hidden">
          <div className="border-b border-slate-200 bg-gradient-to-r from-amber-50 to-rose-50 px-5 py-3">
            <h2 className="text-lg font-semibold text-slate-900">🛟 Proyeksi Survival</h2>
            <p className="text-xs text-slate-600">
              Berdasarkan fase{" "}
              <Link href="/phase" className="font-medium text-brand-700 hover:underline">
                {phase.name}
              </Link>
            </p>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <ProjItem
              label="Fixed income / bulan"
              value={fixedIncome !== null ? idr(fixedIncome) : "—"}
              hint={fixedIncome === null ? "Set di Life Phase" : undefined}
            />
            <ProjItem
              label={`Planned burn (budget ${mk})`}
              value={plannedBurn > 0 ? idr(plannedBurn) : "—"}
              hint={plannedBurn === 0 ? "Set budget dulu di bawah" : undefined}
            />
            <ProjItem
              label="Gap bulanan"
              value={monthlyGap !== null ? `${monthlyGap >= 0 ? "+" : "−"}${idr(Math.abs(monthlyGap))}` : "—"}
              tone={monthlyGap !== null ? (monthlyGap >= 0 ? "good" : "bad") : undefined}
            />
            <ProjItem label="Aset likuid (cash + investasi)" value={idr(liquidAssets)} />
            <ProjItem
              label="Runway"
              value={
                monthlyGap === null
                  ? "—"
                  : monthlyGap >= 0
                    ? "∞ (cashflow positif)"
                    : runwayMonths !== null
                      ? `${runwayMonths} bulan`
                      : "0 bulan — tanpa buffer"
              }
              tone={
                monthlyGap === null
                  ? undefined
                  : monthlyGap >= 0 || (runwayMonths !== null && runwayMonths >= 6)
                    ? "good"
                    : "bad"
              }
            />
            <ProjItem
              label="Income tambahan untuk break-even"
              value={monthlyGap !== null && monthlyGap < 0 ? `≥ ${idr(-monthlyGap)} / bulan` : "Tidak perlu 🎉"}
              tone={monthlyGap !== null && monthlyGap < 0 ? "bad" : "good"}
            />
          </div>
          {monthlyGap !== null && monthlyGap < 0 && (
            <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-600">
              💡 Setiap pemasukan tambahan yang tercatat akan memperlihatkan progress menuju break-even.
              Catat semua transaksi supaya proyeksi makin akurat, dan update nilai aset secara berkala.
            </div>
          )}
        </section>
      )}

      {/* Add transaction */}
      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">➕ Catat Transaksi</h2>
        <form action={addTxn} className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="label">Tanggal</label>
            <input type="date" name="date" defaultValue={toInputDate(new Date())} required className="input" />
          </div>
          <div>
            <label className="label">Jenis</label>
            <select name="kind" className="input">
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
            </select>
          </div>
          <div>
            <label className="label">Kategori</label>
            <input name="category" required placeholder="Makan / Transport / Gaji" className="input" />
          </div>
          <div>
            <label className="label">Jumlah (Rp)</label>
            <input type="number" name="amount" min={1} required className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Deskripsi</label>
            <input name="description" required className="input" />
          </div>
          <div>
            <label className="label">Akun</label>
            <input name="account" placeholder="BCA / Cash / GoPay" className="input" />
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full">Simpan</button>
          </div>
        </form>
      </section>

      {/* Budget */}
      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">📊 Budget Bulan {mk}</h2>
        <form action={addBudget} className="mb-4 grid gap-3 sm:grid-cols-4">
          <input type="hidden" name="month" value={mk} />
          <div className="sm:col-span-2">
            <label className="label">Kategori</label>
            <input name="category" required placeholder="Makan" className="input" />
          </div>
          <div>
            <label className="label">Limit (Rp)</label>
            <input type="number" name="limit" required className="input" />
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full">Set</button>
          </div>
        </form>

        {budgets.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada budget. Set kategori utama dulu.</p>
        ) : (
          <ul className="space-y-3">
            {budgets.map((b) => {
              const spent = spentByCat[b.category] || 0;
              const pct = Math.min(100, Math.round((spent / b.limit) * 100));
              const over = spent > b.limit;
              return (
                <li key={b.id}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-slate-800">{b.category}</span>
                    <span className="flex items-center gap-2">
                      <span className={over ? "text-rose-600 font-semibold" : "text-slate-600"}>
                        {idr(spent)} / {idr(b.limit)} ({pct}%)
                      </span>
                      <form action={delBudget}>
                        <input type="hidden" name="id" value={b.id} />
                        <button className="text-slate-300 transition hover:text-rose-500" title="Hapus budget" aria-label={`Hapus budget ${b.category}`}>
                          ✕
                        </button>
                      </form>
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full ${over ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Aset */}
      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">🏦 Aset</h2>
        <form action={addAsset} className="mb-4 grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label">Nama</label>
            <input name="name" required placeholder="Tabungan BCA" className="input" />
          </div>
          <div>
            <label className="label">Jenis</label>
            <select name="kind" className="input">
              <option value="cash">Cash</option>
              <option value="investment">Investasi</option>
              <option value="property">Properti</option>
              <option value="receivable">Piutang</option>
            </select>
          </div>
          <div>
            <label className="label">Nilai (Rp)</label>
            <input type="number" name="value" required className="input" />
          </div>
          <div className="sm:col-span-3">
            <label className="label">Catatan</label>
            <input name="note" className="input" />
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full">Tambah aset</button>
          </div>
        </form>

        {assets.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada aset tercatat.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {assets.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{a.name}</p>
                  <p className="text-xs text-slate-500">{a.kind}{a.note ? ` · ${a.note}` : ""}</p>
                </div>
                <form action={updateAsset} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={a.id} />
                  <input
                    type="number"
                    name="value"
                    defaultValue={a.value}
                    className="input !w-36 !py-1 text-right"
                  />
                  <button className="btn-ghost !py-1 !text-xs">Update</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Goals */}
      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">🎯 Financial Goals</h2>
        <form action={addGoal} className="mb-4 grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label">Tujuan</label>
            <input name="title" required placeholder="DP Rumah" className="input" />
          </div>
          <div>
            <label className="label">Target (Rp)</label>
            <input type="number" name="targetAmt" required className="input" />
          </div>
          <div>
            <label className="label">Saat ini</label>
            <input type="number" name="currentAmt" defaultValue={0} className="input" />
          </div>
          <div>
            <label className="label">Deadline</label>
            <input type="date" name="deadline" className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Catatan</label>
            <input name="note" className="input" />
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full">Tambah</button>
          </div>
        </form>

        <ul className="space-y-4">
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.currentAmt / g.targetAmt) * 100));
            return (
              <li key={g.id}>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-slate-900">{g.title}</p>
                    <p className="text-xs text-slate-500">
                      {idr(g.currentAmt)} / {idr(g.targetAmt)} ({pct}%)
                      {g.deadline ? ` · target ${fmtDate(g.deadline)}` : ""}
                    </p>
                  </div>
                  <form action={updateGoal} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={g.id} />
                    <input type="number" name="currentAmt" defaultValue={g.currentAmt} className="input !w-32 !py-1 text-right" />
                    <button className="btn-ghost !py-1 !text-xs">Update</button>
                  </form>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-gradient-to-r from-brand-400 to-violet-500" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Recent Txns */}
      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Transaksi Terbaru</h2>
        {allTxns.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada transaksi.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {allTxns.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full ${t.kind === "income" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                  {t.kind === "income" ? "↓" : "↑"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{t.description}</p>
                  <p className="text-xs text-slate-500">
                    {fmtDate(t.date)} · {t.category}
                    {t.account ? ` · ${t.account}` : ""} · {t.user.emoji} {t.user.name}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${t.kind === "income" ? "text-emerald-700" : "text-rose-700"}`}>
                  {t.kind === "income" ? "+" : "-"}{idr(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ProjItem({
  label, value, hint, tone,
}: {
  label: string; value: string; hint?: string; tone?: "good" | "bad";
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={`mt-1 text-lg font-bold ${
          tone === "good" ? "text-emerald-700" : tone === "bad" ? "text-rose-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "emerald" | "rose" | "violet" }) {
  const map = {
    emerald: "from-emerald-100 to-teal-50 text-emerald-800",
    rose: "from-rose-100 to-pink-50 text-rose-800",
    violet: "from-violet-100 to-fuchsia-50 text-violet-800",
  } as const;
  return (
    <div className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${map[tone]} p-4`}>
      <p className="text-[11px] uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
