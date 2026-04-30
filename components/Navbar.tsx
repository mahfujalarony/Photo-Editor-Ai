import React from 'react'
import Link from 'next/link'

const Navbar = () => {
  return (
    <div>
    <header className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex-shrink-0 font-bold text-2xl text-blue-600 tracking-tight">
            Lumina<span className="text-gray-900">AI</span>
          </Link>
          <nav className="hidden md:flex gap-8">
            <Link href="#features" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition">Features</Link>
            <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition">Pricing</Link>
            <Link href="/blog" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition">Blog</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-900 hover:text-blue-600">Log in</Link>
            <Link href="/signup" className="text-sm font-medium bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 transition">
              Get Started Free
            </Link>
          </div>
        </div>
      </header>
    </div>
  )
}

export default Navbar
