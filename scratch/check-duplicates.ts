import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkDuplicates() {
  const duplicates = await prisma.userSchoolAccess.groupBy({
    by: ['userId', 'schoolId'],
    where: {
      campusId: null,
    },
    _count: {
      _all: true,
    },
    having: {
      schoolId: {
        _count: {
          gt: 1,
        }
      }
    }
  });
  
  console.log('Duplicates found:', duplicates);
  await prisma.$disconnect();
}

checkDuplicates();
