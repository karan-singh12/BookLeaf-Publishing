"use client";

import { useState } from "react";
import { Alert, Button } from "@/components/ui";
import { authService } from "@/services/auth.service";
import type { User } from "@/types/domain";

interface OnboardAuthorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (author: User) => void;
}

export function OnboardAuthorModal({ isOpen, onClose, onSuccess }: OnboardAuthorModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Password123!");
  const [authorCode, setAuthorCode] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAuthor, setCreatedAuthor] = useState<User | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const author = await authService.onboardAuthor({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim() || undefined,
        authorCode: authorCode.trim() || undefined,
        phone: phone.trim() || undefined,
        city: city.trim() || undefined,
      });

      setCreatedAuthor(author);
      onSuccess?.(author);
    } catch (err) {
      setError((err as Error).message || "Failed to onboard author. Please check the inputs.");
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setName("");
    setEmail("");
    setPassword("Password123!");
    setAuthorCode("");
    setPhone("");
    setCity("");
    setError(null);
    setCreatedAuthor(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div
        className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-2xl transition-all"
        role="dialog"
        aria-labelledby="onboard-author-title"
      >
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h2 id="onboard-author-title" className="text-lg font-semibold text-ink">
              Onboard New Author
            </h2>
            <p className="mt-0.5 text-xs text-ink-soft">
              Provision a new author account for the BookLeaf Publishing Portal.
            </p>
          </div>
          <button
            onClick={resetAndClose}
            className="rounded-lg p-1 text-ink-faint hover:bg-slate-100 hover:text-ink transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {createdAuthor ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-900">
              <div className="flex items-center gap-2 font-semibold">
                <span className="text-base">🎉</span> Author Onboarded Successfully!
              </div>
              <p className="mt-1 text-xs text-emerald-800">
                The author account is now active. You can log in as this author on the login page to test their dashboard.
              </p>

              <div className="mt-3 space-y-1.5 rounded-lg bg-white/80 p-3 text-xs font-mono text-ink">
                <div><span className="text-ink-soft">Name:</span> {createdAuthor.name}</div>
                <div><span className="text-ink-soft">Email:</span> {createdAuthor.email}</div>
                <div><span className="text-ink-soft">Author Code:</span> {createdAuthor.authorCode ?? "Assigned"}</div>
                <div><span className="text-ink-soft">Password:</span> {password}</div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={resetAndClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {error && <Alert kind="error">{error}</Alert>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-ink">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Vikramaditya Roy"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="author@example.com"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-ink">
                  Author Code <span className="text-ink-faint font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={authorCode}
                  onChange={(e) => setAuthorCode(e.target.value)}
                  placeholder="Auto (e.g. AUTH011)"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink">
                  Initial Password
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-ink">
                  City <span className="text-ink-faint font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bangalore"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink">
                  Phone Number <span className="text-ink-faint font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91-98765-43210"
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
              <Button variant="ghost" onClick={resetAndClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={loading}>
                Onboard Author
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
