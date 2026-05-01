import { Metadata } from 'next';
import ImageToTextClient from './ImageToTextClient';
import Navbar from '@/components/Navbar';

// Advanced SEO Metadata
export const metadata: Metadata = {
  title: 'Image to Text Converter - Extract Text via AI | Lumina AI',
  description: 'Instantly extract text from images using advanced AI. Free online OCR tool to convert photos, screenshots, and scanned documents into editable text.',
  keywords: 'image to text, OCR online, extract text from image, picture to text, photo to text converter, Lumina AI, free OCR tool, copy text from image, handwriting to text',
  openGraph: {
    title: 'Free Image to Text (OCR) Converter | Lumina AI',
    description: 'Upload an image and instantly extract the text using AI. Works with screenshots, documents, and photos in multiple languages.',
    url: 'https://photoeditor.rony.studio/tools/image-to-text', 
    siteName: 'Lumina AI',
    images: [
      {
        url: '/ocr-banner.jpg', // পাবলিক ফোল্ডারে এই ব্যানারটি রাখবেন
        width: 1200,
        height: 630,
        alt: 'Lumina AI Image to Text Extractor',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  alternates: {
    canonical: 'https://photoeditor.rony.studio/tools/image-to-text',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Image to Text Converter - Extract Text via AI | Lumina AI',
    description: 'Instantly extract text from images using advanced AI. Free online OCR tool.',
    images: ['/ocr-banner.jpg'],
  },
};

export default function ImageToTextPage() {
  // 1. Web Application JSON-LD
  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Lumina AI Image to Text Extractor",
    "url": "https://photoeditor.rony.studio/tools/image-to-text",
    "applicationCategory": "UtilitiesApplication",
    "operatingSystem": "All",
    "description": "Extract text from any image instantly using advanced AI OCR technology.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  // 2. FAQ JSON-LD (গুগলের "People Also Ask" সেকশনে আসার জন্য)
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How to extract text from an image?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Simply upload your image, screenshot, or scanned document to Lumina AI's Image to Text tool. Our advanced AI will automatically scan and extract the text for you to copy and edit."
        }
      },
      {
        "@type": "Question",
        "name": "Is this OCR tool free to use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, Lumina AI offers a free online image to text converter that works instantly without requiring any software installation."
        }
      }
    ]
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Inject Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      
      <Navbar />

      {/* Hero Section */}
      <header className="py-12 sm:py-16 lg:py-20 text-center max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 text-slate-900 leading-tight">
          Extract Text from <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Images</span>
        </h1>
        <h2 className="text-base sm:text-lg lg:text-xl text-slate-600 font-medium max-w-2xl mx-auto">
          Turn pictures, scanned documents, and screenshots into perfectly formatted, editable text in seconds using AI.
        </h2>
      </header>

      {/* Interactive Tool Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-4 sm:p-6 lg:p-8">
          <ImageToTextClient />
        </div>
      </section>

      {/* SEO Content Section (গুগলে র‍্যাংক করার জন্য এই অংশটি খুবই জরুরি) */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="prose prose-slate prose-lg max-w-none">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-6 text-center">
            How Does the AI Image to Text Converter Work?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 mt-8">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold">1</div>
              <h3 className="font-bold text-lg mb-2">Upload Image</h3>
              <p className="text-sm text-slate-600">Upload any photo, receipt, or screenshot containing text.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold">2</div>
              <h3 className="font-bold text-lg mb-2">AI Processing</h3>
              <p className="text-sm text-slate-600">Our smart OCR technology scans and identifies text accurately.</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold">3</div>
              <h3 className="font-bold text-lg mb-2">Copy & Edit</h3>
              <p className="text-sm text-slate-600">Instantly copy the formatted text to your clipboard.</p>
            </div>
          </div>

          <div className="mt-16 space-y-8">
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Why choose Lumina AI for Optical Character Recognition (OCR)?</h3>
              <p className="text-slate-600 leading-relaxed">
                Manually typing text from an image is time-consuming and frustrating. Our advanced <strong>Image to Text converter</strong> utilizes state-of-the-art Artificial Intelligence to instantly extract text from images with high precision. Whether you are digitizing class notes, pulling data from an invoice, or copying a quote from a screenshot, this tool handles it effortlessly.
              </p>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Supports Multiple Languages and Formats</h3>
              <p className="text-slate-600 leading-relaxed">
                Unlike traditional OCR tools that struggle with poor quality images, our AI can read blurry texts, handwritten notes, and documents in over 50+ languages including English, Spanish, Bengali, and Chinese. Just upload a JPG, PNG, or WebP file, and let the AI do the heavy lifting.
              </p>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}