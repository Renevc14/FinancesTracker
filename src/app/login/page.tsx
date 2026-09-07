"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { APP_NAME } from "@/lib/brand";
import { loginAction, type LoginState } from "@/lib/login-action";

const initial: LoginState = {};

function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          defaultValue="rene"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="totp">2FA</Label>
        <Input
          id="totp"
          name="totp"
          inputMode="numeric"
          autoComplete="one-time-code"
        />
      </div>
      {state.error && (
        <p
          className="rounded-[var(--radius)] bg-[var(--danger)]/10 px-3 py-2 text-[15px] text-[var(--danger)]"
          role="alert"
        >
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Signing in…" : "Continue"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center px-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[var(--bg)]" />
      <div className="w-full max-w-sm animate-fade-in space-y-8">
        <p className="ios-large-title text-center text-[var(--ink)]">
          {APP_NAME}
        </p>
        <div className="ios-group p-5 shadow-sm">
          <Suspense
            fallback={
              <p className="text-center text-[15px] text-[var(--muted)]">
                Loading…
              </p>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
