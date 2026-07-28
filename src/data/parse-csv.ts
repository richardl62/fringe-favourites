/** Parse RFC4180-ish CSV text into rows of fields.
 * Handles quoted fields, embedded commas/newlines, and "" escaping.
 * Throws only for a structurally broken file (unterminated quote) - a
 * problem with one row's content is the caller's job to report. */
export function parseCsv(text: string): string[][] {
  const BOM = "﻿";
  const withoutBom = text.startsWith(BOM) ? text.slice(BOM.length) : text;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < withoutBom.length; i++) {
    const char = withoutBom[i];

    if (inQuotes) {
      if (char === '"') {
        if (withoutBom[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      endField();
    } else if (char === "\r") {
      // Ignore - the following "\n" (or end of input) ends the row.
    } else if (char === "\n") {
      endRow();
    } else {
      field += char;
    }
  }

  if (inQuotes) {
    throw new Error("Unterminated quoted field in CSV");
  }
  if (field !== "" || row.length > 0) {
    endRow();
  }

  // Drop trailing blank lines.
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}
