import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

// SEO Optimization - Next.js Metadata API
export const metadata: Metadata = {
  title: 'Lumina AI - The Ultimate AI Photo Editor',
  description: 'Enhance, retouch, and transform your photos in seconds with advanced AI technology. Remove backgrounds, upscale images, and generate stunning art effortlessly.',
  keywords: ['AI photo editor', 'online image editor', 'AI background remover', 'upscale image AI', 'photo enhancement SaaS'],
  openGraph: {
    title: 'Lumina AI - AI Powered Photo Editing',
    description: 'Transform your photos instantly with next-gen AI tools.',
    type: 'website',
    url: 'https://yourdomain.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lumina AI - The Ultimate AI Photo Editor',
    description: 'Enhance and transform your photos in seconds.',
  }
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      
      {/* Header / Navbar */}
      <Navbar />

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          {/* H1 is crucial for SEO */}
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 mb-6">
            Edit photos like a pro, <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              powered by AI.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto mb-10">
            Remove backgrounds, enhance quality, and apply magical edits with a single click. No design skills required.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/editor" className="px-8 py-4 text-lg font-semibold rounded-full text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition">
              Try the Editor Now
            </Link>
            <Link href="#demo" className="px-8 py-4 text-lg font-semibold rounded-full text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 transition">
              View Examples
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              {/* H2 for secondary SEO keywords */}
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Everything you need to perfect your images</h2>
              <p className="mt-4 text-lg text-gray-600">Our AI models are trained to handle complex editing tasks instantly.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {/* Feature 1 */}
              <Link href="/tools/image-resizer" className="p-8 border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition bg-gray-50">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-6 text-xl">✨</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Image Resizer</h3>
                <p className="text-gray-600">Resize images to any dimension while maintaining quality.</p>
              </Link>

              {/* Feature 2 */}
              <Link href="/tools/remove-background" className="p-8 border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition bg-gray-50">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-6 text-xl">✂️</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Background Removal</h3>
                <p className="text-gray-600">Instantly isolate subjects from complex backgrounds with pixel-perfect precision.</p>
              </Link>

                            {/* Feature 3 */}
              <Link href="/tools/image-to-text" className="p-8 border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition bg-gray-50">
                <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center mb-6 text-xl">📝</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Image to Text</h3>
                <p className="text-gray-600">Extract text from images with high accuracy and speed.</p>
              </Link>

              {/* Feature 4 */}
              <Link href="/tools/nature-background-editor" className="p-8 border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition bg-gray-50">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-6 text-xl">🎨</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Nature Background</h3>
                <p className="text-gray-600">Enhance your images with beautiful, natural backgrounds.</p>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-blue-600 text-white text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to transform your visual content?</h2>
            <p className="text-xl text-blue-100 mb-10">Join thousands of creators, marketers, and photographers worldwide.</p>
            <Link href="/signup" className="px-8 py-4 text-lg font-semibold rounded-full text-blue-600 bg-white hover:bg-gray-100 shadow-lg transition">
              Create Your Free Account
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p>&copy; {new Date().getFullYear()} Lumina AI. All rights reserved.</p>
          <div className="mt-4 flex justify-center gap-6">
            <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms of Service</Link>
            <Link href="/contact" className="hover:text-white transition">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}