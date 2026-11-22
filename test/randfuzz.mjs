// Seeded random differential fuzz: random small CSV-ish strings over an
// alphabet heavy in , " \r \n, compared exactly vs the reference.
import { run } from '../solve.js';
import { readCsv } from '/home/hatch/workspace/make-fun/csv-reader-speed-01-run-20261121-kit/baselines/csv-reader/vendor/csv-reader/index.js';

let seed = Number(process.env.FUZZ_SEED || 123456789);
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const ALPHA = ['a', 'b', ',', '"', '\r', '\n', ' ', 'x', '1', '\uFEFF'];
const pick = () => ALPHA[Math.floor(rnd() * ALPHA.length)];

const N = Number(process.argv[2] || 3000);
let pass = 0, fail = 0;
for (let i = 0; i < N; i++) {
  const len = Math.floor(rnd() * 60);
  let text = '';
  for (let j = 0; j < len; j++) text += pick();
  const input = { text, header: rnd() < 0.5 };
  const a = JSON.stringify(run(input));
  const b = JSON.stringify(readCsv(input));
  if (a === b) pass++;
  else {
    fail++;
    if (fail <= 5) console.log('FAIL', JSON.stringify(text), 'header', input.header, '\n  got', a, '\n  ref', b);
  }
}
console.log(`randfuzz: ${pass}/${N} PASS, ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
