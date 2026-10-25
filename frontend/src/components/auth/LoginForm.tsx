"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert, Button, Input } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api-client";
import { DEMO_ACCOUNTS, DEMO_MODE, DEMO_PASSWORD, HOME_BY_ROLE } from "@/lib/constants";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const signIn = async (emailAddress: string, pass: string) => {
    setPending(true);
    setError(null);
    try {
      const user = await login(emailAddress, pass);
      router.replace(HOME_BY_ROLE[user.role]);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught : new ApiError("Something went wrong. Please try again.", 0, "UNKNOWN"));
      setPending(false);
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void signIn(email.trim(), password);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <Alert kind="error">{error.message}</Alert>}
        <Input
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={error?.fieldMessage("email")}
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={error?.fieldMessage("password")}
          required
        />
        <Button type="submit" loading={pending} disabled={!email || !password} className="w-full">
          Sign in
        </Button>
      </form>

      {DEMO_MODE && (
        <section aria-label="Demo accounts" className="rounded-lg border border-dashed border-line bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Demo accounts</p>
          <p className="mt-1 text-xs text-ink-soft">
            One click signs you in. Password for all: <code className="rounded bg-white px-1 py-0.5">{DEMO_PASSWORD}</code>
          </p>
          <ul className="mt-3 space-y-2">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void signIn(account.email, DEMO_PASSWORD)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 text-left text-sm hover:border-brand-600 disabled:opacity-60"
                >
                  <span className="font-medium text-ink">{account.label}</span>
                  <span className="text-xs text-ink-soft">{account.hint}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
