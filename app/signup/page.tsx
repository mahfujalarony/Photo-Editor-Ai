"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      setError(payload?.message ?? "Registration failed. Please try again.");
      setIsLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/tools/nature-background-editor",
      redirect: false,
    });

    if (result?.error) {
      setError("Account created, but sign-in failed. Please log in.");
      setIsLoading(false);
      return;
    }

    if (result?.url) {
      window.location.href = result.url;
      return;
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-16">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        <div className="mb-6 space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Lumina AI
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-600">
            Start editing with AI-powered tools in seconds.
          </p>
        </div>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/tools/nature-background-editor" })}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          OR
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-slate-700">
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              required
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a password"
              minLength={8}
              required
              className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            />
          </label>
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isLoading ? "Creating account..." : "Create account with Email"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="font-semibold text-blue-600 hover:text-blue-700" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
