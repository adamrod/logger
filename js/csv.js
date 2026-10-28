export function toCsv(rows, columns) {
  const line = (cells) => cells.map(quote).join(',');
  return [line(columns), ...rows.map((row) => line(columns.map((column) => row[column] ?? '')))].join('\n') + '\n';
}

export function parseCsv(text, numberColumns = []) {
  const [header, ...rows] = parseRows(text);
  if (!header) return [];
  return rows
    .filter((cells) => cells.some(Boolean))
    .map((cells) => Object.fromEntries(header
      .map((column, i) => [column, cells[i]])
      .filter(([, cell]) => cell)
      .map(([column, cell]) => [column, numberColumns.includes(column) ? Number(cell) : cell])));
}

function quote(value) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function parseRows(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (char !== '\r') cell += char;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
}
