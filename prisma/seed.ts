import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.command.count();
  if (count > 0) return;

  await prisma.command.create({
    data: {
      name: "gvrc_ping",
      description: "Example configurable command (edit/delete in the dashboard).",
      enabled: true,
      guildOnly: true,
      dmPermission: false,
      responseType: "TEXT",
      ephemeral: true,
      responseTemplate: {
        text: "Pong! (configured via GVRC Command Dashboard)",
      },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
