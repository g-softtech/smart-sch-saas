const fs = require('fs');
const lines = fs.readFileSync('packages/core-platform/full_schema.sql', 'utf8').split('\n');
const tables = ['fin_financial_adjustments', 'fin_wallets', 'fin_wallet_transactions', 'fin_wallet_allocations', 'fin_periods', 'fin_refunds'];

for (const t of tables) {
  const start = lines.findIndex(l => l.includes(`CREATE TABLE "${t}"`));
  if (start > -1) {
    let end = start;
    while(lines[end].trim() !== '') {
      end++;
    }
    console.log(lines.slice(start, end).join('\n') + '\n');
  }
}
