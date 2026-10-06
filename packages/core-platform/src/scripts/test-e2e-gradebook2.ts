import { kernel } from "../index";
import { ResultsEngineService } from "../../../../apps/api-gateway/src/modules/academics/services/results-engine.service";

async function main() {
  const mathSubject = await kernel.db.subject.findFirst({ where: { name: { contains: 'math', mode: 'insensitive' } } });
  
  if (!mathSubject) throw new Error("Math not found");

  const components = await kernel.db.assessmentComponent.findMany({
      where: { subjectId: mathSubject.id, class: { name: { contains: 'grade 3', mode: 'insensitive' } } }
  });

  const grade3Class = await kernel.db.class.findFirst({ where: { id: components[0]?.classId } });
  if (!grade3Class) throw new Error("Class not found from components");

  const subjectResult = await kernel.db.subjectResult.findFirst({
      where: { subjectId: mathSubject.id, enrollment: { classId: grade3Class.id } },
      include: { enrollment: true }
  });

  if (!subjectResult) throw new Error("No student enrolled with subject result");

  const tenantId = grade3Class.tenantId;
  const schoolId = grade3Class.schoolId;
  const engine = new ResultsEngineService();

  console.log("\n--- TEST 1: SET SCORES TO ACHIEVE 80 ---");
  
  await kernel.db.assessmentScore.deleteMany({
      where: { subjectResultId: subjectResult.id, assessmentComponentId: { in: components.map(c => c.id) } }
  });

  const getCompData = (weightTarget: number) => {
    return components.map(c => {
        // e.g. if weight is 40, we want to achieve a score such that (score/maxScore) * weight = 80% of weight (for test 1)
        // actually if we want sum=80 out of 100, we can just give 80% score to each component.
        // score = (weightTarget/100) * maxScore
        return {
            tenantId, schoolId, subjectResultId: subjectResult.id,
            maxScore: c.maxScore || 100,
            assessmentComponentId: c.id,
            score: ((weightTarget/100) * (c.maxScore || 100))
        };
    });
  };

  await kernel.db.assessmentScore.createMany({
      data: getCompData(80)
  });

  await kernel.db.$transaction(async (tx) => {
      await engine.recalculateSubjectResult(tenantId, schoolId, subjectResult.id, tx as any);
  });

  let res = await kernel.db.subjectResult.findUnique({ where: { id: subjectResult.id } });
  console.log("Calculated DB TotalScore (Expected 80):", res?.totalScore);

  console.log("\n--- TEST 2: SET SCORES TO ACHIEVE 50 ---");
  
  await kernel.db.assessmentScore.deleteMany({
      where: { subjectResultId: subjectResult.id, assessmentComponentId: { in: components.map(c => c.id) } }
  });

  await kernel.db.assessmentScore.createMany({
      data: getCompData(50)
  });

  await kernel.db.$transaction(async (tx) => {
      await engine.recalculateSubjectResult(tenantId, schoolId, subjectResult.id, tx as any);
  });

  res = await kernel.db.subjectResult.findUnique({ where: { id: subjectResult.id } });
  console.log("Calculated DB TotalScore (Expected 50):", res?.totalScore);
  console.log("Grade assigned:", res?.grade);

}
main().catch(console.error).finally(() => process.exit(0));
