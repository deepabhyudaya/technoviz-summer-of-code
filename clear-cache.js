const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.badgeCache.deleteMany().then(() => console.log('Cleared'));
