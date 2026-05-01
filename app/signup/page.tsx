"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";

export default function SignupPage() {
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

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-700">
            Email
            <input
              type="email"
              placeholder="Email sign-up coming soon"
              disabled
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Password
            <input
              type="password"
              placeholder="Password sign-up coming soon"
              disabled
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
            />
          </label>
          <button
            type="button"
            disabled
            className="w-full rounded-full border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-400"
          >
            Create account with Email
          </button>
        </div>

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
