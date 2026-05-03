import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import MagicEraserClient from "./MagicEraserClient";

export const metadata: Metadata = {
  title: 'AI Magic Eraser | Remove Objects from Photos Instantly',
  description: 'Remove unwanted objects, people, or text from your photos online for free. Use Lumina AI Magic Eraser to clean up your images in seconds.',
  keywords: ['magic eraser', 'object removal', 'remove person from photo', 'AI photo cleanup', 'online photo editor'],
  openGraph: {
    title: 'Free AI Magic Eraser - Lumina AI',
    description: 'Instantly remove unwanted objects from any photo.',
    url: 'https://rony.studio/tools/magic-eraser',
  }
};

export default function MagicEraserPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />

      {/* Tool Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-b from-blue-50 to-white px-4">
        <div className="max-w-5xl mx-auto text-center">
          <nav className="mb-4 text-sm text-gray-500">
            <Link href="/" className="hover:text-blue-600">Home</Link> / <span>Tools</span> / <span className="text-blue-600">Magic Eraser</span>
          </nav>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6">
            Remove Unwanted Objects <br />
            <span className="text-blue-600 italic">Automatically with AI</span>
          </h1>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
            Brush over Photobombers, text, or any unwanted elements to erase them instantly.
          </p>

          <MagicEraserClient />
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6 leading-tight">
              Why use our AI Magic Eraser?
            </h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-6 text-xs font-bold text-green-600 mt-1">OK</div>
                <div>
                  <h3 className="font-bold text-gray-900">Seamless Inpainting</h3>
                  <p className="text-gray-600">Our advanced LAMA model reconstructions backgrounds seamlessly where objects used to be.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-6 text-xs font-bold text-green-600 mt-1">OK</div>
                <div>
                  <h3 className="font-bold text-gray-900">Easy to use</h3>
                  <p className="text-gray-600">Just highlight what you want gone and the AI does the heavy lifting.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-6 text-xs font-bold text-green-600 mt-1">OK</div>
                <div>
                  <h3 className="font-bold text-gray-900">Save Time</h3>
                  <p className="text-gray-600">No need for complex clone-stamping or healing brushes in professional software.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative rounded-2xl overflow-hidden shadow-xl border border-gray-100 bg-gray-50 aspect-video flex items-center justify-center">
             <div className="text-center p-10">
                <p className="text-gray-400 font-medium italic">[Before / After Image Slider Placeholder]</p>
                <p className="text-sm text-gray-400 mt-2 italic">Showing the magic of AI erasing</p>
             </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 text-center">
        <h2 className="text-3xl font-bold mb-6">Experience the magic of Lumina AI today</h2>
        <div className="flex justify-center mt-8">
          <Link href="/signup" className="inline-block px-8 py-3 sm:px-10 sm:py-4 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition shadow-xl">
            Create Account for Free
          </Link>
        </div>
      </section>

    </div>
  );
}
