"use client";

import { useActionState } from "react";
import { signInAction, type LoginState } from "@/app/admin/login/actions";
import { ar } from "@/content/ar";

const initial: LoginState = { error: null };

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState(signInAction, initial);
  const message = state.error ?? notice;

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1 block font-semibold text-brand-900">{ar.admin.email}</span>
        <input
          name="email"
          type="email"
          dir="ltr"
          autoComplete="username"
          required
          maxLength={256}
          className="w-full rounded-xl border border-brand-100 px-4 py-3 text-start focus:border-brand-500 focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1 block font-semibold text-brand-900">{ar.admin.password}</span>
        <input
          name="password"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          required
          maxLength={256}
          className="w-full rounded-xl border border-brand-100 px-4 py-3 text-start focus:border-brand-500 focus:outline-none"
        />
      </label>
      {message && (
        <p role="alert" className="rounded-xl bg-coral-500/10 px-4 py-3 text-sm font-semibold text-coral-500">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand-700 px-6 py-3 font-bold text-white hover:bg-brand-900 disabled:opacity-60"
      >
        {ar.admin.signIn}
      </button>
    </form>
  );
}
