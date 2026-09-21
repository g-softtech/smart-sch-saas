import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanupDuplicates() {
  const duplicates = await prisma.userSchoolAccess.groupBy({
    by: ['userId', 'schoolId'],
    where: { campusId: null },
    _count: { _all: true },
    having: { schoolId: { _count: { gt: 1 } } }
  });
  
  for (const dup of duplicates) {
    const records = await prisma.userSchoolAccess.findMany({
      where: { userId: dup.userId, schoolId: dup.schoolId, campusId: null },
      orderBy: { createdAt: 'asc' } // Assuming there's a createdAt or just id
    });
    
    // Keep the first one, delete the rest
    for (let i = 1; i < records.length; i++) {
      console.log(`Deleting duplicate: ${records[i].id}`);
      await prisma.userSchoolAccess.delete({ where: { id: records[i].id } });
    }
  }
  
  console.log('Duplicates cleaned up.');
  await prisma.$disconnect();
}

cleanupDuplicates();
