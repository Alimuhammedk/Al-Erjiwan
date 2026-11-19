"use client";

import { startTransition, useActionState, type FormEvent } from "react";

// Runs a server action from a form WITHOUT React's automatic form reset. With a plain `action={...}`, React 19
// empties the fields after every submit, so a validation error would wipe what the admin typed.
export function useFormAction<S extends object>(action: (prev: S, formData: FormData) => Promise<S>, initial: S) {
  const [state, run, pending] = useActionState(action as (prev: Awaited<S>, formData: FormData) => Promise<S>, initial as Awaited<S>);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => run(data));
  };
  return { state: state as S, onSubmit, pending };
}
