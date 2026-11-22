[![csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/KembangPasir-dot/csv-reader-speed-01/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/KembangPasir-dot/csv-reader-speed-01/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121)

# csv-reader-speed-01

A fast drop-in for make.fun's own csv-reader 1.0.0: `solve.js` answers
`{columns, rows, errors}` for every `{text, header}` input exactly as
csv-reader 1.0.0 does — same broken-row policy (BOM, stray CR, unterminated
quotes, quote junk, short/long rows, CRLF and lone CR inside quotes) — but
with an indexOf-driven scanner instead of the reference's
one-character-at-a-time loop.

Entry for [Read broken CSV files faster, 21 November 2026](https://make.fun/bounty/csv-reader-speed-01-run-20261121).

## Layout

- `solve.js` — the entry: `export function run(input)`.
- `main.ts` — the house driver, unchanged from the kit baseline.
- `test/` — differential tests against the kit's vendor csv-reader 1.0.0
  (`diff.mjs`: the 6 practice cases; `fuzz.mjs`: hand-written edge cases;
  `randfuzz.mjs`: seeded random small CSVs).
