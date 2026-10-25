"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { SessionExpiredNotice } from "@/components/auth/SessionExpiredNotice";
import { useAuth } from "@/context/AuthContext";
import { HOME_BY_ROLE } from "@/lib/constants";

const HIGHLIGHTS = [
  { title: "Your books and royalties", text: "Sales, payouts and what is still pending, in one place." },
  { title: "Help that keeps up with you", text: "Raise a query and follow every reply live, without refreshing." },
  { title: "Clear, honest answers", text: "Replies use your real book data, so you get specifics, not boilerplate." },
];

export default function LoginPage() {
  const { user, status } = useAuth();
  const router = useRouter();

  // Already signed in: skip the form.
  useEffect(() => {
    if (status === "authenticated" && user) router.replace(HOME_BY_ROLE[user.role]);
  }, [status, user, router]);

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section aria-hidden className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-emerald-600 p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-black/10" />

        <div className="relative flex items-center gap-3 text-lg font-semibold">
          <span className="grid size-10 place-items-center rounded-xl bg-white/15 ring-1 ring-white/30">B</span>
          BookLeaf Publishing
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">Everything about your books, one calm place.</h2>
          <ul className="mt-8 space-y-5">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white/20 text-xs">✓</span>
                <p className="text-sm text-emerald-50">
                  <span className="block font-semibold text-white">{item.title}</span>
                  {item.text}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-emerald-100">Author Support &amp; Communication Portal</p>
      </section>

      <section className="grid place-items-center px-4 py-10">
        <div className="w-full max-w-md space-y-6">
          <div>
            <span aria-hidden className="grid size-11 place-items-center rounded-xl bg-brand-700 text-lg font-bold text-white lg:hidden">
              B
            </span>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight lg:mt-0">Welcome back</h1>
            <p className="mt-1 text-sm text-ink-soft">Sign in to see your books, royalties and support tickets.</p>
          </div>

          <Suspense>
            <SessionExpiredNotice />
          </Suspense>

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
