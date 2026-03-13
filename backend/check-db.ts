import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const config = await prisma.botConfig.findFirst();
  const groups = await prisma.group.findMany();
  const msgs = await prisma.message.findMany();
  console.log('Bot Config:', config);
  console.log('Groups:', groups);
  console.log('Messages:', msgs);
}
check().finally(() => prisma.$disconnect());
