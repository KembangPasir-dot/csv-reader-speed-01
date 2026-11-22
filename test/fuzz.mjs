// Hand-written edge cases vs the kit's vendor csv-reader 1.0.0.
// Exact JSON.stringify equality per case.
import { run } from '../solve.js';
import { readCsv } from '/home/hatch/workspace/make-fun/csv-reader-speed-01-run-20261121-kit/baselines/csv-reader/vendor/csv-reader/index.js';

const T = (text, header = true) => ({ text, header });
const cases = [
  T(''), T('\uFEFF'), T('\uFEFFa,b\n1,2\n'), T('a,b\n1,2'), T('a,b\n1,2\n'),
  T('a,b\n'), T('a,b'), T('a\n1\n2\n', false), T('a,b,c\n1,2\n3,4,5,6\n', true),
  T('a,b\n1\n', true), T('a,b\n1,2,3\n', true), T('a,b\n,2\n', true),
  T('a,b\n\n1,2\n', true), T('\n\na,b\n\n1,2\n\n', true),
  T('a,b\r\n1,2\r\n', true), T('a,b\r1,2\r', true), T('a,b\r\n1,2', true),
  T('a,b\n1\r2,3\n', true), T('a,b\n1\r\n2,3\n', true), T('a,b\n"x\ry",2\n', true),
  T('a,b\n"x\r\ny",2\n', true), T('a,b\n"x\ny",2\n', true),
  T('a,b\n"q""q",2\n', true), T('a,b\n"""",2\n', true), T('a,b\n"",2\n', true),
  T('a,b\n"x"junk,2\n', true), T('a,b\n"x" ,2\n', true), T('a,b\n"x"x"y,2\n', true),
  T('a,b\n"x"\r,2\n', true), T('a,b\n"x"\r', true), T('a,b\n"x"', true),
  T('a,b\n"x', true), T('a,b\n"x\n1,2\n3,4\n', true), T('a,b\n"x""y\n', true),
  T('a,b\nx"y,2\n', true), T('a,b\n"x"y', true), T('a,b\nab"cd,ef\n', true),
  T('\ra,b\n1,2\n', true), T('\r\na,b\n1,2\n', true), T('a,b\n\r\n1,2\n', true),
  T('a,b\n\r1,2\n', true), T('a,b\n1,2\r', true), T('a,b\n1,2\r3,4', true),
  T('a,b\n"a,b",2\n', true), T('a,b\n"a\nb",2\nc,d\n', true),
  T('a,b\n"unterminated', false), T('"a', false), T('"', false),
  T('a,b\n"x"junk', true), T('a,b\n"x"junk\n', true), T('a,b\n""x,2\n', true),
  T('a,b\n"x\ry\rz",2\n3,4\n', true), T('a,b\n"x\r\ry",2\n', true),
  T('\uFEFFa,b\n"caf\u00e9",2\n', true), T('a,b\n"\u6771\u4eac",2\n', true),
  T('a\n"1\n2\n3"\n', true), T('a,b\n1,2\n\n\n', true),
  T('a,b\n"a""b""c",2\n', true), T('a,b\n"x" , "y" \n', true),
  T('a,b\n"x"junk"more,2\n', true), T('a,b\n"x"\r\n"y",2\n', true),
  T('a,b\r\n"x\r\ny"\r\n', true), T(',,,\n,,,\n', true), T(',\n,\n', true),
  T('a,b\n1,2\n"bad', true), T('a,b\n"bad\n1,2\n', false),
  T('a,b\n"x" \r\n1,2\n', true), T('a,b\n"x"kg,2\n', true),
  T('a,b\n"x" (est.),2\n', true), T('a,b\n"x"!,2\n', true),
];

let pass = 0;
cases.forEach((input, i) => {
  const a = JSON.stringify(run(input));
  const b = JSON.stringify(readCsv(input));
  const ok = a === b;
  if (ok) pass++;
  else console.log('FAIL', i, JSON.stringify(input.text), 'header', input.header, '\n  got', a, '\n  ref', b);
});
console.log(`fuzz: ${pass}/${cases.length} PASS`);
process.exit(pass === cases.length ? 0 : 1);
