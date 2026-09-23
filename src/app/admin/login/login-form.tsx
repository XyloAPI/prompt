"use client";

import * as React from "react";
import { apiLogin, apiMe } from "@/lib/admin-api";
import { RippleButton, RippleButtonRipples } from "@/components/animate-ui/components/buttons/ripple";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  // Already signed in? Bounce to the console.
  React.useEffect(() => {
    apiMe().then(({ authed }) => {
      if (authed) window.location.assign("/admin");
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await apiLogin(password);
      if (res.error) {
        setError(res.error);
        return;
      }
      window.location.assign("/admin");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Enter admin password"
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
      <RippleButton type="submit" disabled={pending} className="w-full rounded-full">
        {pending ? "Signing in…" : "Sign in"}
        <RippleButtonRipples />
      </RippleButton>
    </form>
  );
}
