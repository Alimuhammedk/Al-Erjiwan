import { describe, expect, it } from "vitest";
import { ar } from "@/content/ar";
import { en } from "@/content/en";
import { customerStatusLabel, timeline } from "../shop/status";

const s = ar.order.statuses;

describe("customerStatusLabel", () => {
  it("gives the Arabic label for every status", () => {
    for (const [key, label] of Object.entries(s)) expect(customerStatusLabel(key)).toBe(label);
  });
  it("treats an unknown status as the first one, never as a blank", () => {
    expect(customerStatusLabel("weird")).toBe(s.new);
  });
});

describe("timeline", () => {
  const states = (status: string) => timeline(status).steps.map((x) => x.state);

  it("a new order is at the first step", () => {
    expect(states("new")).toEqual(["current", "todo", "todo", "todo"]);
  });
  it("shows progress up to the current step", () => {
    expect(states("confirmed")).toEqual(["done", "current", "todo", "todo"]);
    expect(states("shipped")).toEqual(["done", "done", "current", "todo"]);
  });
  it("a delivered order is complete", () => {
    expect(states("delivered")).toEqual(["done", "done", "done", "done"]);
  });
  it("labels the steps in order", () => {
    expect(timeline("new").steps.map((x) => x.label)).toEqual([s.new, s.confirmed, s.shipped, s.delivered]);
  });
  it("a cancelled or returned order ends the timeline", () => {
    expect(timeline("cancelled")).toEqual({ steps: [], ended: "cancelled" });
    expect(timeline("returned")).toEqual({ steps: [], ended: "returned" });
  });
  it("an unknown status falls back to the start", () => {
    expect(states("weird")).toEqual(["current", "todo", "todo", "todo"]);
  });
});

describe("status words in English", () => {
  it("labels and timeline use the words passed in", () => {
    expect(customerStatusLabel("shipped", en.order.statuses)).toBe("With the delivery company");
    expect(customerStatusLabel("weird", en.order.statuses)).toBe("Under review");
    expect(timeline("confirmed", en.order.statuses).steps.map((x) => x.label)).toEqual(["Under review", "Order confirmed", "With the delivery company", "Delivered"]);
  });
});
