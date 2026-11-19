import { ar } from "@/content/ar";

const STEPS = ["new", "confirmed", "shipped", "delivered"] as const;
const labels = ar.order.statuses as Record<string, string>;

// The status as the customer reads it. An unknown value is treated as the first step, never shown blank.
export function customerStatusLabel(status: string): string {
  return labels[status] ?? labels.new;
}

export type TimelineStep = { key: string; label: string; state: "done" | "current" | "todo" };

// The progress line on the tracking page. A cancelled or returned order is not a step on the line: it ends it.
export function timeline(status: string): { steps: TimelineStep[]; ended: "cancelled" | "returned" | null } {
  if (status === "cancelled" || status === "returned") return { steps: [], ended: status };
  const at = (STEPS as readonly string[]).indexOf(status);
  const current = at === -1 ? 0 : at;
  const finished = status === "delivered";
  return {
    ended: null,
    steps: STEPS.map((key, i) => ({
      key,
      label: labels[key],
      state: finished || i < current ? "done" : i === current ? "current" : "todo",
    })),
  };
}
