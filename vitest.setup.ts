import { vi } from "vitest";

// updateTag only works inside a real server action; tests check it was called.
vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
