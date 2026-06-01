import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";

const COOKIE = "rylis_session";
const ALG = "HS256";

function key() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession() {
  const jar = await cookies();
  const t = jar.get(COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    const user = await prisma.user.findUnique({
      where: { id: payload.uid as string },
    });
    return user ? { userId: user.id, name: user.name, emoji: user.emoji, loginId: user.loginId } : null;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}
