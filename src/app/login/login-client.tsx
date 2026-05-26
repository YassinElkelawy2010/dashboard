"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => searchParams.get("next") || "/app", [searchParams]);

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-16">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-indigo-500/10 backdrop-blur">
        <div className="text-sm font-semibold uppercase tracking-wider text-white/50">GVRA</div>
        <div className="mt-2 text-3xl font-semibold tracking-tight">Command Dashboard</div>
        <div className="mt-2 text-sm text-white/60">Sign in with your local admin credentials.</div>

        <form
          className="mt-8 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            setError(null);
            try {
              const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ username, password }),
              });
              const json = await res.json();
              if (!res.ok || json?.ok === false) {
                throw new Error(json?.error?.message || "Login failed.");
              }
              router.push(nextPath);
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Login failed.");
            } finally {
              setLoading(false);
            }
          }}
        >
          <label className="block space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-white/45">Username</div>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
              autoComplete="username"
            />
          </label>

          <label className="block space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-white/45">Password</div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none focus:border-indigo-400/60"
              autoComplete="current-password"
            />
          </label>

          {error ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-400 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-6 text-xs text-white/45">
          Configure credentials in <code className="rounded-md bg-black/30 px-1 py-0.5">dashboard/.env.local</code>.
        </div>
      </div>
    </div>
  );
}
