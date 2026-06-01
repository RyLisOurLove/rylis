import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import VaultList from "./VaultList";

const UNLOCK_COOKIE = "rylis_vault_unlock";

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSession();
  const sp = await searchParams;
  const jar = await cookies();
  const unlocked = jar.get(UNLOCK_COOKIE)?.value === "1";

  async function unlock(formData: FormData) {
    "use server";
    const code = String(formData.get("passcode") || "");
    if (code !== (process.env.VAULT_PASSCODE || "123456")) {
      revalidatePath("/vault");
      // redirect with error
      const { redirect } = await import("next/navigation");
      redirect("/vault?error=1");
    }
    const jar = await cookies();
    jar.set(UNLOCK_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15, // 15 minutes
    });
    revalidatePath("/vault");
  }

  async function relock() {
    "use server";
    const jar = await cookies();
    jar.delete(UNLOCK_COOKIE);
    revalidatePath("/vault");
  }

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-md space-y-6 pt-8">
        <header className="text-center">
          <div className="mb-3 text-5xl">🔐</div>
          <h1 className="text-2xl font-bold text-slate-900">Account Vault</h1>
          <p className="mt-1 text-sm text-slate-600">Masukkan passcode untuk membuka.</p>
        </header>

        {sp.error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-center text-sm text-rose-700">
            Passcode salah.
          </p>
        )}

        <form action={unlock} className="card space-y-3 p-5">
          <div>
            <label className="label">Passcode</label>
            <input name="passcode" type="password" autoFocus required className="input text-center text-lg tracking-widest" />
          </div>
          <button className="btn-primary w-full">Buka</button>
          <p className="text-center text-[11px] text-slate-400">Default passcode: 123456 — ubah di .env</p>
        </form>
      </div>
    );
  }

  const entries = await prisma.vaultEntry.findMany({
    orderBy: { label: "asc" },
    include: { addedBy: true },
  });

  async function add(formData: FormData) {
    "use server";
    const s = await requireSession();
    await prisma.vaultEntry.create({
      data: {
        label: String(formData.get("label")),
        username: String(formData.get("username")),
        password: String(formData.get("password")),
        url: String(formData.get("url") || "") || null,
        note: String(formData.get("note") || "") || null,
        addedById: s.userId,
      },
    });
    revalidatePath("/vault");
  }
  async function del(formData: FormData) {
    "use server";
    await prisma.vaultEntry.delete({ where: { id: String(formData.get("id")) } });
    revalidatePath("/vault");
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">🔐 Account Vault</h1>
          <p className="mt-1 text-sm text-slate-600">Akun bersama — terbuka 15 menit.</p>
        </div>
        <form action={relock}>
          <button className="btn-ghost !text-xs">Kunci sekarang</button>
        </form>
      </header>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Tambah Akun</h2>
        <form action={add} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Label</label>
            <input name="label" required placeholder="Netflix / WiFi Rumah" className="input" />
          </div>
          <div>
            <label className="label">URL</label>
            <input name="url" placeholder="https://" className="input" />
          </div>
          <div>
            <label className="label">Username / Email</label>
            <input name="username" required className="input" />
          </div>
          <div>
            <label className="label">Password</label>
            <input name="password" required className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Catatan</label>
            <input name="note" className="input" />
          </div>
          <div>
            <button className="btn-primary">Simpan</button>
          </div>
        </form>
      </section>

      <VaultList entries={entries.map(e => ({
        id: e.id, label: e.label, username: e.username, password: e.password,
        url: e.url, note: e.note, addedByName: `${e.addedBy.emoji} ${e.addedBy.name}`
      }))} onDelete={del} />
    </div>
  );
}
