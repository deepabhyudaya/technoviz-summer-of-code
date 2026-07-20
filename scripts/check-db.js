const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const themes = await prisma.usernameColorShopItem.findMany({
    where: { shade: 'gradient' }
  });
  for (const t of themes) {
    const v = JSON.parse(t.colorValue);
    console.log(t.name, v['--card']);
  }
}
check().then(() => process.exit(0));
