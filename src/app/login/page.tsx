import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, getSession } from "@/lib/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const s = await getSession();
  if (s) redirect("/");
  const sp = await searchParams;

  async function action(formData: FormData) {
    "use server";
    const loginId = String(formData.get("loginId") || "").toLowerCase().trim();
    const password = String(formData.get("password") || "");
    const u = await prisma.user.findUnique({ where: { loginId } });
    if (!u || !(await bcrypt.compare(password, u.passwordHash))) {
      redirect("/login?error=1");
    }
    await createSession(u!.id);
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="mb-2 text-5xl">💞</div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">RyLis</h1>
          <p className="mt-1 text-sm text-slate-500">
            Ryan &amp; Lisa — bermanfaat, bertumbuh, berdampak.
          </p>
        </div>

        {sp.error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Login ID atau password salah.
          </div>
        )}

        <form action={action} className="space-y-4">
          <div>
            <label className="label">Login ID</label>
            <input
              name="loginId"
              required
              autoFocus
              placeholder="ryan / lisa"
              className="input"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input name="password" type="password" required className="input" />
          </div>
          <button className="btn-primary w-full !py-2.5">Masuk</button>
        </form>
      </div>
    </main>
  );
}
