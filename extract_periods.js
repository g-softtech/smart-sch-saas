const fs = require('fs');
const text = fs.readFileSync('packages/core-platform/full_schema.sql', 'utf8');
const tables = ['fin_financial_periods', 'fin_financial_accounts'];

for (const t of tables) {
  const regex = new RegExp('CREATE TABLE "' + t + '" ([\\s\\S]*?);', 'g');
  const match = text.match(regex);
  if (match) {
    console.log('-- TABLE: ' + t);
    console.log(match[0]);
    console.log();
  } else {
    console.log('-- NOT FOUND: ' + t);
  }
}

// Also find FK constraints for those tables
for (const t of tables) {
  const fksOutRegex = new RegExp('ALTER TABLE "' + t + '" ADD CONSTRAINT "[^"]+" FOREIGN KEY [^;]+;', 'g');
  const fksOut = text.match(fksOutRegex);
  if (fksOut) {
    fksOut.forEach(fk => console.log(fk));
    console.log();
  }
}

// And indexes
for (const t of tables) {
  const idxRegex = new RegExp('CREATE (UNIQUE )?INDEX "[^"]+" ON "' + t + '"[^;]+;', 'g');
  const idxs = text.match(idxRegex);
  if (idxs) {
    idxs.forEach(idx => console.log(idx));
    console.log();
  }
}
