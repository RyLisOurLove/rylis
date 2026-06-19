import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { generateAgentToken } from "@/lib/agentAuth";
import { fmtDate } from "@/lib/fmt";
import AgentInstructions from "./AgentInstructions";
import { headers } from "next/headers";

export default async function AgentPage() {
  const s = await requireSession();
  const tokens = await prisma.agentToken.findMany({
    where: { userId: s.userId },
    orderBy: { createdAt: "desc" },
  });

  // Detect base URL for instructions.
  const h = await headers();
  const host = h.get("host") || "your-rylis-url.vercel.app";
  const proto = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${proto}://${host}`;

  async function createToken(formData: FormData) {
    "use server";
    const ss = await requireSession();
    const label = String(formData.get("label") || "Untitled");
    await prisma.agentToken.create({
      data: {
        userId: ss.userId,
        label,
        token: generateAgentToken(),
      },
    });
    revalidatePath("/agent");
  }
  async function revokeToken(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    await prisma.agentToken.delete({ where: { id } });
    revalidatePath("/agent");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">🤖 Agent Setup</h1>
        <p className="mt-1 text-sm text-slate-600">
          Hubungkan RyLis ke <strong>Claude.ai</strong> (Pro / Max / Free — semua tier didukung).
          Setelah connected, kamu bisa ngobrol natural dengan Claude tentang hidupmu dan dia tahu
          semua data RyLis real-time.
        </p>
      </header>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">🔑 Token Aktif</h2>
        <p className="mb-4 text-xs text-slate-500">
          Buat 1 token per device/aplikasi. Bisa di-revoke kapan saja kalau hilang/curiga bocor.
        </p>

        <form action={createToken} className="mb-4 flex gap-2">
          <input
            name="label"
            required
            placeholder="Contoh: Claude.ai Web, Claude Desktop, HP Ryan"
            className="input flex-1"
          />
          <button className="btn-primary">+ Bikin token</button>
        </form>

        {tokens.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada token. Bikin satu untuk mulai.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {tokens.map((t) => (
              <li key={t.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{t.label}</p>
                    <p className="text-[11px] text-slate-500">
                      Dibuat {fmtDate(t.createdAt)}
                      {t.lastUsedAt && ` · terakhir dipakai ${fmtDate(t.lastUsedAt)}`}
                    </p>
                    <code className="mt-2 block break-all rounded bg-slate-100 px-2 py-1.5 font-mono text-[11px] text-slate-700">
                      {t.token}
                    </code>
                  </div>
                  <form action={revokeToken}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="text-xs text-rose-600 hover:underline">Revoke</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AgentInstructions baseUrl={baseUrl} userName={s.name} userEmoji={s.emoji} />
    </div>
  );
}
