import "dotenv/config";
import cron from "node-cron";
import { prisma } from "@personal-blog/db/src/client.js";
import { app } from "./app.js";
import { env } from "./lib/env.js";
import { backupQueue } from "./services/backupQueue.js";

cron.schedule("0 2 * * *", async () => {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const user of users) {
    const backup = await prisma.backupJob.create({
      data: { userId: user.id, type: "auto", format: "json", status: "queued" }
    });
    await backupQueue.add("auto-backup", { userId: user.id, format: "json", backupJobId: backup.id });
  }
});

app.listen(env.port, () => {
  console.log(`API listening on ${env.port}`);
});
