"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { login, type LoginState } from "@/app/admin/actions";

const input =
  "h-12 w-full rounded-xl border border-border-strong bg-card px-4 text-base text-fg sm:text-[15px] placeholder:text-faint outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-4 focus:ring-accent/15 aria-[invalid=true]:border-red-400";

export function LoginForm({ next = "/admin" }: { next?: "/admin" | "/mail" }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);
  const [show, setShow] = useState(false);
  const invalid = !!state?.error;

  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="username" className="mb-2 block text-sm font-medium text-fg">
          Username
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state?.username}
          aria-invalid={invalid}
          aria-describedby={invalid ? "login-error" : undefined}
          className={input}
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-fg">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-invalid={invalid}
            aria-describedby={invalid ? "login-error" : undefined}
            className={`${input} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="absolute inset-y-0 right-1.5 my-auto grid size-9 place-items-center rounded-lg text-faint hover:bg-chip hover:text-fg"
          >
            {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
          </button>
        </div>
      </div>

      <label className="flex w-fit cursor-pointer items-center gap-3 text-[15px] text-fg-soft">
        <input type="checkbox" name="remember" className="size-[18px] accent-[var(--accent)]" />
        Keep me signed in
      </label>

      {state?.error && (
        <p
          id="login-error"
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-70"
      >
        {pending && <LoaderCircle className="size-4 animate-spin" />}
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
