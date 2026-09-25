const fs = require('fs');
const text = fs.readFileSync('packages/core-platform/full_schema.sql', 'utf8');
const tables = ['fin_financial_adjustments', 'fin_wallets', 'fin_wallet_transactions', 'fin_wallet_allocations', 'fin_periods', 'fin_refunds'];
let out = '';

for (const t of tables) {
  const regex = new RegExp('CREATE TABLE "' + t + '" \\([\\s\\S]*?\\);', 'g');
  const match = text.match(regex);
  if (match) {
    out += match[0] + '\n\n';
  }
}

// Find all foreign keys that reference these tables
const fksRegex = /ALTER TABLE "[^"]+" ADD CONSTRAINT "[^"]+" FOREIGN KEY \([^)]+\) REFERENCES "(fin_financial_adjustments|fin_wallets|fin_wallet_transactions|fin_wallet_allocations|fin_periods|fin_refunds)"[^;]+;/g;
const fks = text.match(fksRegex);
if (fks) {
  out += fks.join('\n\n') + '\n\n';
}

// Also find foreign keys inside these new tables referencing other tables
for (const t of tables) {
  const fksOutRegex = new RegExp('ALTER TABLE "' + t + '" ADD CONSTRAINT "[^"]+" FOREIGN KEY [^;]+;', 'g');
  const fksOut = text.match(fksOutRegex);
  if (fksOut) {
    out += fksOut.join('\n\n') + '\n\n';
  }
}

// And finally the index/unique statements for these tables
for (const t of tables) {
  const idxRegex = new RegExp('CREATE (UNIQUE )?INDEX "[^"]+" ON "' + t + '"[^;]+;', 'g');
  const idxs = text.match(idxRegex);
  if (idxs) {
    out += idxs.join('\n\n') + '\n\n';
  }
}

fs.writeFileSync('extracted_tables.sql', out);
