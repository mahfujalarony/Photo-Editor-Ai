import { Metadata } from 'next';
import ResizerClient from './ResizerClient';
import Navbar from '@/components/Navbar';

// Advanced SEO Metadata
export const metadata: Metadata = {
  title: 'Free Online Image Resizer - Crop & Compress Photos | Lumina AI',
  description: 'Resize, crop, and compress images online for free. Maintain high quality while changing width and height in pixels for social media, e-commerce, and web.',
  keywords: 'image resizer, online photo resizer, crop image, compress image, change picture dimensions, Lumina AI, free image editor, resize pixels, webp converter',
  openGraph: {
    title: 'Free Online Image Resizer & Cropper | Lumina AI',
    description: 'Easily change the dimensions or compress the file size of your images in seconds without losing quality.',
    url: 'https://photoeditor.rony.studio/tools/image-resizer', 
    siteName: 'Lumina AI',
    images: [
      {
        url: '/resizer-banner.webp', // আপনার জেনারেট করা ব্যানারটি পাবলিক ফোল্ডারে রাখুন
        width: 1200,
        height: 630,
        alt: 'Lumina AI Image Resizer Tool Interface',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  alternates: {
    canonical: 'https://photoeditor.rony.studio/tools/image-resizer',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Online Image Resizer | Lumina AI',
    description: 'Instantly resize and compress your photos for free.',
    images: ['/resizer-banner.webp'], // Twitter Card এর জন্য একই ব্যানার ব্যবহার করা যেতে পারে
  },
};

export default function ImageResizerPage() {
  // JSON-LD Structured Data for Google Rich Snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Lumina AI Image Resizer",
    "url": "https://photoeditor.rony.studio/tools/image-resizer",
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "All",
    "description": "Free online web application to resize, crop, and compress images with AI-powered quality retention.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <Navbar />
      {/* Inject Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Header Section - Fully Responsive */}
      <header className="py-12 sm:py-16 lg:py-20 text-center max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 text-slate-900 leading-tight">
          Free Online <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Image Resizer</span>
        </h1>
        <h2 className="text-base sm:text-lg lg:text-xl text-slate-600 font-medium max-w-2xl mx-auto">
          Quickly crop, resize, and compress your pictures to exact dimensions in pixels. 
          Fast, secure, and 100% free for everyone.
        </h2>
      </header>

      {/* Interactive Resizer Tool (Client Component) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 lg:pb-24">
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-2 sm:p-4">
          <ResizerClient />
        </div>
      </section>

      {/* SEO Content Section: Search engines love structured text and steps */}
      <article className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-100">
        
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Optimize Your Images in Seconds</h2>
          <p className="text-slate-500 mt-3">Everything you need to get the perfect photo dimensions.</p>
        </div>

        {/* Responsive Grid for Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {/* Box 1 */}
          <div className="bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-5">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
            </div>
            <h3 className="text-lg font-bold mb-3 text-slate-800">Perfect Dimensions</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Scale your photos to the exact width and height you need. Perfect for Facebook covers, Instagram posts, or e-commerce product listings.
            </p>
          </div>

          {/* Box 2 */}
          <div className="bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-5">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <h3 className="text-lg font-bold mb-3 text-slate-800">Smart Compression</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Large images slow down your website. Reduce file sizes to specific targets (like 500KB) while maintaining crisp visual quality.
            </p>
          </div>

          {/* Box 3 */}
          <div className="bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-5">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <h3 className="text-lg font-bold mb-3 text-slate-800">Privacy First</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Your files are completely secure. Cropping happens directly in your browser, and uploaded files are instantly deleted from our servers after processing.
            </p>
          </div>
        </div>
      </article>
    </main>
  );
}