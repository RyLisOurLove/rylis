/**
 * Ganti password user — pakai untuk rotasi password Ryan/Lisa
 * setelah deploy production.
 *
 * Usage:
 *   npx tsx scripts/change-password.ts ryan PasswordBaru2026
 *   npx tsx scripts/change-password.ts lisa PasswordRahasiaLisa
 *
 * DATABASE_URL diambil dari .env — pastikan menunjuk ke DB yang benar
 * (lokal atau production Neon) sebelum dijalankan.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const [, , loginId, newPassword] = process.argv;

if (!loginId || !newPassword) {
  console.error("Usage: npx tsx scripts/change-password.ts <loginId> <newPassword>");
  process.exit(1);
}
if (newPassword.length < 6) {
  console.error("Password minimal 6 karakter.");
  process.exit(1);
}

(async () => {
  const user = await prisma.user.findUnique({ where: { loginId } });
  if (!user) {
    console.error(`User dengan loginId "${loginId}" tidak ditemukan.`);
    process.exit(1);
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { loginId }, data: { passwordHash: hash } });
  console.log(`✓ Password untuk ${user.emoji} ${user.name} (@${loginId}) berhasil diganti.`);
  await prisma.$disconnect();
})();
