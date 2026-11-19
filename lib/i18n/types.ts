import type { ar } from "@/content/ar";

// Turns the literal Arabic words into plain strings, so the English set can have the same shape with different words.
type Widen<T> = T extends string
  ? string
  : T extends boolean
    ? boolean
    : T extends readonly (infer U)[]
      ? readonly Widen<U>[]
      : T extends object
        ? { readonly [K in keyof T]: Widen<T[K]> }
        : T;

// Everything a customer can see in one language (the admin is Arabic only, so it is not part of this).
export type Messages = Widen<Omit<typeof ar, "admin">>;
