const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.user.count();
    console.log("Users count:", count);
  } catch (e) {
    console.error("DB error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
