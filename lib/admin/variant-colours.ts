export type SizeLine = { id: string; size_label: string; price: string; stock: string; colour_id: string };

const sameSize = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// Colours already offered for the same size by other lines (a size cannot offer the same colour twice).
export function takenColours(rows: SizeLine[], index: number): Set<string> {
  const base = rows[index];
  if (!base) return new Set();
  return new Set(rows.filter((r, i) => i !== index && sameSize(r.size_label, base.size_label) && r.colour_id).map((r) => r.colour_id));
}

// Ticking several colours for one size line: the line keeps the size and price and becomes the first colour (when it
// had none), and one new line per extra colour appears right after it with the same size and price. Each colour
// has its own stock, so new lines start at 0 and are edited by the owner. Colours the size already offers are skipped.
export function addColourLines(rows: SizeLine[], index: number, colourIds: string[]): SizeLine[] {
  const base = rows[index];
  if (!base) return rows;
  const taken = takenColours(rows, index);
  const ids = [...new Set(colourIds)].filter((id) => id && !taken.has(id) && id !== base.colour_id);
  if (ids.length === 0) return rows;

  const next = [...rows];
  let rest = ids;
  if (!base.colour_id) {
    next[index] = { ...base, colour_id: ids[0] };
    rest = ids.slice(1);
  }
  const added = rest.map((colour_id) => ({ id: "", size_label: base.size_label, price: base.price, stock: "0", colour_id }));
  next.splice(index + 1, 0, ...added);
  return next;
}
