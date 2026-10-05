const fs = require('fs');
const path = require('path');

const planPath = path.join(__dirname, '../CURRENT_MASTER_EXECUTION_PLAN.md');
let content = fs.readFileSync(planPath, 'utf8');

const newContent = `
  - **Phase 6I - Admin Timetable Management:** **COMPLETE & FULLY VERIFIED**
    - **Scope Completed:**
      - Added \`academics:read_timetable\` and \`academics:manage_timetable\` permissions.
      - Applied strict backend authorization guards to \`TimetableController\` endpoints.
      - Implemented full backend CRUD support for Timetable Periods and Entries (\`TimetableService\`).
      - Prevented orphaned timetable entry cascading logic during period deletion.
      - Preserved robust conflict validation for class-wide vs arm-specific scoping and teacher double-booking.
      - Added "Timetable" navigation to Admin UI (\`/dashboard/timetable\`) after "Academics".
      - Enhanced Admin Timetable UI to support Period and Entry deletion using new backend capabilities.
      - Added \`test-timetable.ts\` to assert strict security boundaries and workflow logic.
    - **Verification Evidence:**
      - Core Platform typecheck & Prisma validation: PASSED (\`0 errors\`).
      - API Gateway build: PASSED (\`0 errors\`).
      - Web App typecheck & production build: PASSED.
      - All Phase 5 & 6 security regressions: PASSED.
    - **Status:** **COMPLETE**.
    - **Next phase:** Pending canonical roadmap directive.
`;

content = content.replace('### Formal Deferred Requirements', newContent + '\n### Formal Deferred Requirements');
fs.writeFileSync(planPath, content);
