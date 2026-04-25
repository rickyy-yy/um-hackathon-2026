import { PrismaClient } from '@prisma/client';
import { mockReportData } from '../lib/mocks';

const prisma = new PrismaClient();

async function main() {
  console.log('Resetting seed data...');
  await prisma.whatIfTurn.deleteMany();
  await prisma.report.deleteMany();
  await prisma.ingredientMapping.deleteMany();
  await prisma.posUpload.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.user.deleteMany();

  const demo = await prisma.user.create({
    data: {
      phone: '+60123456789',
      name: 'Demo User',
      businessName: 'Café Demo',
      businessType: 'cafe',
      language: 'en',
      posType: 'storehub',
    },
  });
  console.log(`Created user: ${demo.name} (${demo.id})`);

  for (const month of ['2026-02', '2026-03', '2026-04']) {
    const data = mockReportData(month);
    await prisma.report.create({
      data: {
        userId: demo.id,
        month,
        monthView: JSON.stringify(data.monthView),
        trendsView: JSON.stringify(data.trendsView),
      },
    });
    console.log(`Seeded report for ${month}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
