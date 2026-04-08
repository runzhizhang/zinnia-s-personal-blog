import bcrypt from "bcryptjs";
import { prisma } from "./client.js";

async function seed() {
  const email = "admin@personal-blog.local";
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return;
  const passwordHash = await bcrypt.hash("admin123456", 10);
  await prisma.user.create({
    data: {
      username: "admin",
      email,
      passwordHash,
      settings: { theme: "light", interactionsEnabled: true }
    }
  });
}

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
