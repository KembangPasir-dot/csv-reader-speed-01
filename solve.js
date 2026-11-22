// Fast drop-in for make.fun's csv-reader 1.0.0.
//
// Same answers, byte for byte: {columns, rows, errors} for {text, header},
// with the reference's exact broken-row policy (U+FEFF drop, stray CR,
// unterminated quotes, quote junk, short/long rows, CRLF and lone CR inside
// quotes read as LF, empty lines are no record, fields stay strings).
// Faster because it never walks one character at a time:
//  - most records take a fast path: one indexOf('\n') finds the record,
//    two bounded indexOf checks prove it holds no quote and no stray CR,
//    and a native split(',') cuts its fields;
//  - records that do hold a quote or a stray CR take an indexOf-driven
//    field parser (nearest-delimiter scans + slices, no per-char loop);
//  - only quoted fields that actually contain a doubled quote or a CR/LF
//    pay for any per-character work, and only over that one field.
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1;

  // Per-record state, set before each record is read.
  let recordLine = 1;
  let recordRow = null;

  // The field just read: its value, how it ended (0 comma, 1 line break,
  // 2 end of text) and how many characters this call kept. The field
  // readers write these instead of allocating a result object per field.
  let fValue = '';
  let fEnded = 0;
  let fAdded = 0;

  function finishRecord(fields) {
    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      return;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }

  // Reads unquoted characters onto `value` up to the next comma or line
  // break. A CR not followed by LF is dropped (stray_cr). The result is
  // written to fValue/fEnded/fAdded (no per-field object); `fAdded` counts
  // the characters kept by this call.
  // Only two indexOf scans per segment: the nearest ',' or LF bounds the
  // segment, and a CR can only hide inside that short slice (a trailing one
  // before the LF is the CRLF terminator, any other is a stray CR).
  function readUnquoted(value) {
    let added = 0;
    fValue = value;
    while (pos < n) {
      const ci = text.indexOf(',', pos);
      const li = text.indexOf('\n', pos);
      if (ci === -1 && li === -1) {
        const s = text.slice(pos);
        if (s.indexOf('\r') === -1) { value += s; added += s.length; }
        else {
          const v = s.replace(/\r/g, '');
          for (let k = s.length - v.length; k > 0; k--) errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
          value += v; added += v.length;
        }
        pos = n;
        fValue = value; fEnded = 2; fAdded = added;
        return;
      }
      let m, ended;
      if (li === -1 || (ci !== -1 && ci < li)) { m = ci; ended = 0; }
      else { m = li; ended = 1; }
      const s = text.slice(pos, m);
      const ri = s.indexOf('\r');
      if (ri === -1) { value += s; added += s.length; }
      else if (ended === 1 && ri === s.length - 1) {
        value += s.slice(0, -1); added += s.length - 1;
        pos = m + 1; line += 1;
        fValue = value; fEnded = 1; fAdded = added;
        return;
      } else {
        // Every CR here is stray, except a trailing one before the LF,
        // which is the CRLF terminator and is dropped without an error.
        let core = s;
        let trailing = false;
        if (ended === 1 && s.charCodeAt(s.length - 1) === 13) { core = s.slice(0, -1); trailing = true; }
        const v = core.replace(/\r/g, '');
        for (let k = core.length - v.length; k > 0; k--) errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
        value += v; added += v.length;
        if (trailing) { pos = m + 1; line += 1; fValue = value; fEnded = 1; fAdded = added; return; }
      }
      if (ended === 0) { pos = m + 1; fValue = value; fEnded = 0; fAdded = added; return; }
      pos = m + 1; line += 1;
      fValue = value; fEnded = 1; fAdded = added;
      return;
    }
    fValue = value; fEnded = 2; fAdded = added;
  }

  // Reads a quoted field whose opening quote is at pos.
  // (Second half of this module, appended below.)
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let p = pos + 1;
    let parts = null;
    let closeQ = -1;
    for (;;) {
      const q = text.indexOf('"', p);
      if (q === -1) break;
      if (text.charCodeAt(q + 1) === 34) {
        if (parts === null) parts = [];
        parts.push(text.slice(p, q));
        parts.push('"');
        p = q + 2;
        continue;
      }
      closeQ = q;
      break;
    }
    if (closeQ === -1) {
      // The quote never closes: it is a literal character, and the text
      // after it is read again as unquoted.
      pos = open + 1;
      line = openLine;
      errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
      return readUnquoted('"');
    }
    let raw = parts === null ? text.slice(open + 1, closeQ) : parts.join('') + text.slice(p, closeQ);
    // Count the line breaks inside the quotes (LF, CRLF and lone CR each
    // one line), then read each CRLF or lone CR as LF.
    if (raw.indexOf('\n') !== -1 || raw.indexOf('\r') !== -1) {
      let delta = 0;
      for (let i = 0; i < raw.length; i++) {
        const c = raw.charCodeAt(i);
        if (c === 10) delta += 1;
        else if (c === 13) { delta += 1; if (raw.charCodeAt(i + 1) === 10) i += 1; }
      }
      line += delta;
      if (raw.indexOf('\r') !== -1) raw = raw.replace(/\r\n?/g, '\n');
    }
    pos = closeQ + 1;
    if (pos >= n) { fValue = raw; fEnded = 2; fAdded = 0; return; }
    const c = text.charCodeAt(pos);
    if (c === 44) { pos += 1; fValue = raw; fEnded = 0; fAdded = 0; return; }
    if (c === 10) { pos += 1; line += 1; fValue = raw; fEnded = 1; fAdded = 0; return; }
    if (c === 13 && text.charCodeAt(pos + 1) === 10) { pos += 2; line += 1; fValue = raw; fEnded = 1; fAdded = 0; return; }
    // What follows the closing quote is appended as it stands, up to the
    // next comma or line break.
    readUnquoted(raw);
    if (fAdded > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
  }

  while (pos < n) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) { pos += 1; line += 1; }
      else if (c === 13 && text.charCodeAt(pos + 1) === 10) { pos += 2; line += 1; }
      else break;
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;

    // Fast path: the record up to the next LF holds no quote and no CR
    // other than a trailing CRLF one, so it is plain fields split by ','.
    const nl = text.indexOf('\n', pos);
    const segEnd = nl === -1 ? n : nl;
    const qIn = text.indexOf('"', pos);
    if (qIn === -1 || qIn >= segEnd) {
      let seg = text.slice(pos, segEnd);
      if (nl !== -1 && seg.charCodeAt(seg.length - 1) === 13) seg = seg.slice(0, -1);
      if (seg.indexOf('\r') === -1) {
        const fields = seg.split(',');
        pos = nl === -1 ? n : nl + 1;
        line += 1;
        finishRecord(fields);
        continue;
      }
    }

    // Slow path: at least one quoted field or stray CR in this record.
    const fields = [];
    let quoted = false;
    do {
      quoted = text.charCodeAt(pos) === 34;
      if (quoted) readQuoted(); else readUnquoted('');
      fields.push(fValue);
    } while (fEnded === 0);

    // A line that held only stray CRs is left with no characters: no record
    // (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;
    finishRecord(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
