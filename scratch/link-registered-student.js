const { kernel, tenantContext } = require("../packages/core-platform/dist/index.js");

async function main() {
  const tenantId = "097c6dc2-1383-447b-a5eb-97ef631f6cff";
  
  await tenantContext.run({ tenantId }, async () => {
    // Find registered student
    const student = await kernel.db.student.findFirst({
      where: { tenantId },
    });

    // Find existing user in idm_users
    const user = await kernel.db.user.findFirst();

    if (!student || !user) {
      console.error("Student or User not found");
      process.exit(1);
    }

    // Link Student -> User
    await kernel.db.student.update({
      where: { id: student.id },
      data: { userId: user.id },
    });

    console.log("==========================================");
    console.log("REGISTERED STUDENT LINKED TO USER ACCOUNT!");
    console.log("==========================================");
    console.log(`Student Name:      ${student.firstName} ${student.lastName}`);
    console.log(`Student Number:    ${student.studentNumber}`);
    console.log(`Linked User Email: ${user.email}`);
    console.log(`Linked User ID:    ${user.id}`);
    console.log("==========================================");
  });
}

main()
  .catch((e) => console.error(e))
  .finally(() => kernel.db.$disconnect());
