import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import RemoveBackgroundTool from './RemoveBackgroundTool';

// SEO Metadata: targeting specific "Background Removal" keywords
export const metadata: Metadata = {
  title: 'AI Background Remover | Remove Image Backgrounds Instantly',
  description: 'Remove backgrounds from images online for free. Use Lumina AI to get transparent backgrounds in seconds with pixel-perfect precision. No design skills needed.',
  keywords: ['remove background', 'bg remover', 'transparent background', 'AI image cutout', 'online photo editor'],
  openGraph: {
    title: 'Free AI Background Remover - Lumina AI',
    description: 'Instantly remove backgrounds from any photo with one click.',
    url: 'https://rony.studio/tools/remove-background',
  }
};

export default function BackgroundRemoverPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />

      {/* Tool Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-b from-blue-50 to-white px-4">
        <div className="max-w-4xl mx-auto text-center">
          <nav className="mb-4 text-sm text-gray-500">
            <Link href="/" className="hover:text-blue-600">Home</Link> / <span>Tools</span> / <span className="text-blue-600">Remove Background</span>
          </nav>
          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-6">
            Remove Image Background <br />
            <span className="text-blue-600 italic">Automatically and Free</span>
          </h1>
          <p className="text-lg text-gray-600 mb-10">
            Upload your photo and let our AI handle the rest. Get a transparent background in seconds.
          </p>

          <RemoveBackgroundTool />
        </div>
      </section>

      {/* Benefits / SEO Content Section */}
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6 leading-tight">
              Why use our AI Background Remover?
            </h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-6 text-xs font-bold text-green-600 mt-1">OK</div>
                <div>
                  <h3 className="font-bold text-gray-900">Pixel-Perfect Precision</h3>
                  <p className="text-gray-600">Our AI identifies hair, fur, and complex edges better than any manual tool.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-6 text-xs font-bold text-green-600 mt-1">OK</div>
                <div>
                  <h3 className="font-bold text-gray-900">100% Automatic</h3>
                  <p className="text-gray-600">No need to draw paths or select areas. Just upload and you&apos;re done.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-6 text-xs font-bold text-green-600 mt-1">OK</div>
                <div>
                  <h3 className="font-bold text-gray-900">Save Time & Money</h3>
                  <p className="text-gray-600">Stop spending hours in Photoshop. Process bulk images in seconds.</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Visual Demo (Placeholder for a before/after image) */}
          <div className="relative rounded-2xl overflow-hidden shadow-xl border border-gray-100 bg-gray-50 aspect-video flex items-center justify-center">
             <div className="text-center p-10">
                <p className="text-gray-400 font-medium italic">[Before / After Image Slider Placeholder]</p>
                <p className="text-sm text-gray-400 mt-2 italic">Showing the magic of transparent backgrounds</p>
             </div>
          </div>
        </div>
      </section>

      {/* SEO FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Common Questions about BG Removal</h2>
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h4 className="text-lg font-bold text-gray-900">Is the AI background remover free?</h4>
              <p className="mt-2 text-gray-600">Yes! You can remove backgrounds from your images for free at standard resolution. For high-res 4K downloads, check out our Pro plans.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h4 className="text-lg font-bold text-gray-900">Does it work with complex images like hair?</h4>
              <p className="mt-2 text-gray-600">Absolutely. Lumina AI is trained on millions of images to handle fine details like hair, fur, and transparent objects perfectly.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h4 className="text-lg font-bold text-gray-900">What file formats are supported?</h4>
              <p className="mt-2 text-gray-600">We support all major formats including PNG, JPG, JPEG, and WebP. Your output will be a high-quality PNG with a transparent background.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 text-center">
        <h2 className="text-3xl font-bold mb-6">Experience the magic of Lumina AI today</h2>
        <div className="flex justify-center mt-8">
          <Link href="/signup" className="inline-block px-8 py-3 sm:px-10 sm:py-4 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition shadow-xl">
            Create Account for Bulk Editing
          </Link>
        </div>
      </section>

    </div>
  );
}
