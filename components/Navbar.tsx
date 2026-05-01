"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

const Navbar = () => {
  const { data: session } = useSession();
  const avatarSrc = session?.user?.image ?? null;
  const displayName = session?.user?.name ?? "Account";

  return (
    <div>
    <header className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
            <Image
              src="/photoeditor.svg"
              alt="Lumina AI logo"
              width={36}
              height={36}
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-contain"
              priority
            />
            <span className="font-bold text-xl sm:text-2xl text-blue-600 tracking-tight">
              Lumina<span className="text-gray-900">AI</span>
            </span>
          </Link>
          <nav className="hidden md:flex gap-8">
            <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition">Features</Link>
            <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition">Pricing</Link>
            <Link href="/blog" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition">Blog</Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            {session ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5">
                  {avatarSrc ? (
                    <Image
                      src={avatarSrc}
                      alt={displayName}
                      width={28}
                      height={28}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                      {displayName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-semibold text-gray-700">
                    {displayName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-sm font-medium text-gray-600 hover:text-blue-600"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium whitespace-nowrap text-gray-900 hover:text-blue-600">Log in</Link>
                <Link href="/signup" className="text-sm font-medium whitespace-nowrap bg-blue-600 text-white px-3 py-1.5 sm:px-5 sm:py-2 rounded-full hover:bg-blue-700 transition">
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
    </div>
  )
}

export default Navbar
