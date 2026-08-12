"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";
import { RippleButton, RippleButtonRipples } from "@/components/animate-ui/components/buttons/ripple";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Enter admin password"
          autoFocus
          required
        />
        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
      </div>
      <RippleButton type="submit" disabled={pending} className="w-full rounded-full">
        {pending ? "Signing in…" : "Sign in"}
        <RippleButtonRipples />
      </RippleButton>
    </form>
  );
}
