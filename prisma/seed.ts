import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const ryanHash = await bcrypt.hash("ryan123", 10);
  const lisaHash = await bcrypt.hash("lisa123", 10);

  await prisma.user.upsert({
    where: { loginId: "ryan" },
    update: {},
    create: {
      loginId: "ryan",
      name: "Ryan",
      emoji: "🎲",
      passwordHash: ryanHash,
    },
  });

  await prisma.user.upsert({
    where: { loginId: "lisa" },
    update: {},
    create: {
      loginId: "lisa",
      name: "Lisa",
      emoji: "🌷",
      passwordHash: lisaHash,
    },
  });

  console.log("✓ Seeded Ryan (ryan / ryan123) and Lisa (lisa / lisa123)");
  console.log("  Vault passcode: 123456 (set via .env VAULT_PASSCODE)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
