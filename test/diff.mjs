// Differential test: our solve.js vs the kit's vendor csv-reader 1.0.0
// on the 6 practice cases. Exact JSON.stringify equality.
import { readFileSync } from 'node:fs';
import { run } from '../solve.js';
import { readCsv } from '/home/hatch/workspace/make-fun/csv-reader-speed-01-run-20261121-kit/baselines/csv-reader/vendor/csv-reader/index.js';

const cases = JSON.parse(readFileSync('/home/hatch/workspace/make-fun/csv-reader-speed-01-run-20261121-kit/practice/input/cases.json', 'utf8'));
let pass = 0;
for (const c of cases) {
  const a = JSON.stringify(run(c.input));
  const b = JSON.stringify(readCsv(c.input));
  const ok = a === b;
  if (ok) pass++;
  console.log(c.id, ok ? 'PASS' : 'FAIL', 'len', c.input.text.length);
  if (!ok) {
    const x = JSON.parse(a), y = JSON.parse(b);
    console.log('  rows', x.rows.length, 'vs', y.rows.length, 'errors', x.errors.length, 'vs', y.errors.length);
    for (let i = 0; i < Math.max(x.rows.length, y.rows.length); i++) {
      if (JSON.stringify(x.rows[i]) !== JSON.stringify(y.rows[i])) { console.log('  first row diff at', i, JSON.stringify(x.rows[i]), 'VS', JSON.stringify(y.rows[i])); break; }
    }
    for (let i = 0; i < Math.max(x.errors.length, y.errors.length); i++) {
      if (JSON.stringify(x.errors[i]) !== JSON.stringify(y.errors[i])) { console.log('  first error diff at', i, JSON.stringify(x.errors[i]), 'VS', JSON.stringify(y.errors[i])); break; }
    }
    console.log('  columns equal:', JSON.stringify(x.columns) === JSON.stringify(y.columns));
  }
}
console.log(`diff: ${pass}/${cases.length} PASS`);
process.exit(pass === cases.length ? 0 : 1);
