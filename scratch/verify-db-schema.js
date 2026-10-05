const { PrismaClient } = require('@saas/core-platform');
const prisma = new PrismaClient();

async function run() {
  try {
    const migrations = await prisma.$queryRaw`SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10`;
    console.log('=== Recent migrations ===');
    migrations.forEach(m => console.log(m.migration_name, m.finished_at));

    const assessmentTypes = await prisma.assessmentType.findMany();
    console.log('\n=== AssessmentType Seed Status ===');
    console.log('Total AssessmentTypes:', assessmentTypes.length);
    
    const schools = await prisma.school.findMany();
    for (const school of schools) {
      const types = await prisma.assessmentType.findMany({ where: { schoolId: school.id } });
      const codes = types.map(t => t.code).sort();
      console.log(`School ${school.id} (${school.name}):`, codes);
    }

    const cbtComps = await prisma.assessmentComponent.findMany({
      include: { assessmentType: true }
    });
    console.log('\n=== AssessmentComponents ===');
    console.log('Total Components:', cbtComps.length);
    for (const comp of cbtComps) {
      console.log(`Component ID: ${comp.id}, type code: ${comp.assessmentType?.code}`);
    }

    const pgIndexes = await prisma.$queryRaw`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename IN ('acd_assessment_components', 'acd_assessment_scores', 'acd_assessment_types')
      ORDER BY tablename, indexname
    `;
    console.log('\n=== Indexes ===');
    for (const idx of pgIndexes) {
      console.log(idx.indexname, '|', idx.indexdef);
    }

    const compCols = await prisma.$queryRaw`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'acd_assessment_components'
      ORDER BY ordinal_position
    `;
    console.log('\n=== acd_assessment_components columns ===');
    compCols.forEach(c => console.log(' ', c.column_name, c.data_type, 'nullable:', c.is_nullable));

    const scoreCols = await prisma.$queryRaw`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'acd_assessment_scores'
      ORDER BY ordinal_position
    `;
    console.log('\n=== acd_assessment_scores columns ===');
    scoreCols.forEach(c => console.log(' ', c.column_name, c.data_type, 'nullable:', c.is_nullable));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
