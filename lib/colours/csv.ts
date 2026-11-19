import { ar } from "@/content/ar";
import { normaliseHex } from "./hex";

const e = ar.admin.colours.csvErrors;

export const MAX_CSV_ROWS = 5000;

export type ColourRow = {
  system: string | null;
  code: string | null;
  name_ar: string;
  name_en: string | null;
  hex: string;
  family: string | null;
};
export type CsvIssue = { line: number; message: string };
export type CsvResult = { rows: ColourRow[]; errors: CsvIssue[]; warnings: CsvIssue[] };

const DEFAULT_COLUMNS = ["system", "code", "name_ar", "name_en", "hex", "family"];
const ALIASES: Record<string, string> = { name: "name_ar", colour: "hex", color: "hex" };

// Splits CSV text into rows of cells (quotes, doubled quotes, commas and line breaks inside quotes), remembering the
// line each row starts on. Blank rows are skipped.
function splitCsv(text: string): { cells: string[]; line: number }[] {
  const out: { cells: string[]; line: number }[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  let start = 1;
  const endRow = () => {
    cells.push(cell);
    if (cells.some((c) => c.trim() !== "")) out.push({ cells, line: start });
    cells = [];
    cell = "";
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else {
        if (ch === "\n") line++;
        cell += ch;
      }
    } else if (ch === '"' && cell.trim() === "") quoted = true;
    else if (ch === ",") {
      cells.push(cell);
      cell = "";
    } else if (ch === "\r") {
      // ignored: the \n that follows ends the row
    } else if (ch === "\n") {
      endRow();
      line++;
      start = line;
    } else cell += ch;
  }
  endRow();
  return out;
}

const clean = (v: string | undefined) => (v ?? "").trim() || null;

// Reads the owner's colour file. Good rows are returned, bad rows are listed with their line number, and nothing
// is guessed: a row is either clearly valid or reported.
export function parseColourCsv(input: string): CsvResult {
  const result: CsvResult = { rows: [], errors: [], warnings: [] };
  const rows = splitCsv(input.replace(/^﻿/, ""));
  if (rows.length === 0) return result;

  let columns = DEFAULT_COLUMNS;
  let data = rows;
  const first = rows[0].cells.map((c) => c.trim().toLowerCase());
  if (first.includes("hex") || first.includes("name_ar") || first.includes("name") || first.includes("colour") || first.includes("color")) {
    columns = first.map((c) => ALIASES[c] ?? c);
    data = rows.slice(1);
    if (!columns.includes("hex") || !columns.includes("name_ar")) {
      result.errors.push({ line: rows[0].line, message: e.header });
      return result;
    }
  }
  if (data.length > MAX_CSV_ROWS) {
    result.errors.push({ line: data[0].line, message: e.tooMany.replace("{n}", String(MAX_CSV_ROWS)) });
    return result;
  }

  const seen = new Map<string, number>(); // "system|code" -> index in result.rows
  for (const { cells, line } of data) {
    const get = (name: string) => clean(cells[columns.indexOf(name)]);
    const name_ar = get("name_ar") ?? "";
    const hexText = get("hex") ?? "";
    const hex = normaliseHex(hexText);
    const row: ColourRow = {
      system: get("system"),
      code: get("code"),
      name_ar,
      name_en: get("name_en"),
      hex: hex ?? "",
      family: get("family"),
    };

    let message: string | null = null;
    if (name_ar.length < 2) message = e.name;
    else if (name_ar.length > 100 || (row.name_en?.length ?? 0) > 100) message = e.tooLong;
    else if (!hex) message = e.hex;
    else if ((row.system?.length ?? 0) > 50 || (row.code?.length ?? 0) > 40 || (row.family?.length ?? 0) > 40) message = e.tooLong;
    if (message) {
      result.errors.push({ line, message });
      continue;
    }

    if (row.code) {
      const key = `${row.system ?? ""}|${row.code}`;
      const at = seen.get(key);
      if (at !== undefined) {
        result.warnings.push({ line, message: e.duplicate });
        result.rows[at] = row;
        continue;
      }
      seen.set(key, result.rows.length);
    }
    result.rows.push(row);
  }
  return result;
}
