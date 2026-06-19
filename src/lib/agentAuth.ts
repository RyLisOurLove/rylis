import { prisma } from "./prisma";
import { randomBytes } from "crypto";

export type AgentUser = {
  userId: string;
  name: string;
  emoji: string;
  loginId: string;
  tokenLabel: string;
};

/**
 * Verify a Bearer token from /api/agent/* requests. Returns the owning user
 * (Ryan or Lisa) or null on failure. Also records lastUsedAt so users can
 * see if a token is dormant.
 */
export async function verifyAgentToken(authHeader: string | null): Promise<AgentUser | null> {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+([a-zA-Z0-9_-]{16,})$/);
  if (!match) return null;
  const token = match[1];
  const row = await prisma.agentToken.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!row) return null;
  // fire-and-forget update
  prisma.agentToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return {
    userId: row.user.id,
    name: row.user.name,
    emoji: row.user.emoji,
    loginId: row.user.loginId,
    tokenLabel: row.label,
  };
}

export function generateAgentToken(): string {
  // 32 hex chars = 128 bits, plenty for bearer auth
  return randomBytes(32).toString("hex");
}
