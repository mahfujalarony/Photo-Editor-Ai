import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

// SEO Optimization
export const metadata: Metadata = {
  title: 'Pricing | Lumina AI - Simple & Transparent Plans',
  description: 'Choose the perfect Lumina AI plan for your photo editing needs. From free basic tools to advanced AI generation for professionals and teams.',
  keywords: ['AI photo editor pricing', 'image editor subscription', 'Lumina AI plans', 'pro AI tools'],
};

// Pricing Data Array for easy maintenance
const pricingPlans = [
  {
    name: 'Starter',
    price: '$0',
    duration: '/month',
    description: 'Perfect for casual users who want to try our AI magic.',
    features: [
      '10 AI Generations per month',
      'Standard resolution exports',
      'Basic background removal',
      'Community support',
    ],
    buttonText: 'Get Started Free',
    buttonLink: '/signup',
    isPopular: false,
  },
  {
    name: 'Creator',
    price: '$12',
    duration: '/month',
    description: 'Ideal for content creators and professionals needing power.',
    features: [
      'Unlimited AI Generations',
      '4K & 8K Ultra HD exports',
      'Advanced Magic Eraser & Retouching',
      'Priority processing',
      'Commercial usage rights',
    ],
    buttonText: 'Start 7-Day Free Trial',
    buttonLink: '/signup?plan=creator',
    isPopular: true, // This will highlight the plan
  },
  {
    name: 'Team',
    price: '$39',
    duration: '/month',
    description: 'For agencies and teams collaborating on visual content.',
    features: [
      'Everything in Creator',
      'Up to 5 team members',
      'Shared workspace & assets',
      'API access (10k calls/mo)',
      '24/7 Dedicated support',
    ],
    buttonText: 'Contact Sales',
    buttonLink: '/contact',
    isPopular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
         {/* Header / Navbar */}
      <Navbar />
        
    <div className="min-h-screen bg-gray-50 py-24 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-gray-600">
            No hidden fees. No surprise charges. Choose the plan that best fits your creative workflow.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center max-w-6xl mx-auto">
          {pricingPlans.map((plan) => (
            <div 
              key={plan.name} 
              className={`relative bg-white rounded-3xl shadow-sm border p-8 flex flex-col h-full transition-transform duration-300 hover:shadow-xl ${
                plan.isPopular ? 'border-blue-600 ring-2 ring-blue-600 scale-105 md:-mt-4 md:mb-4 z-10' : 'border-gray-200'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold tracking-wide uppercase">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-gray-500 mt-2 text-sm">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-5xl font-extrabold text-gray-900">{plan.price}</span>
                <span className="text-gray-500 font-medium">{plan.duration}</span>
              </div>

              <ul className="flex-1 space-y-4 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="h-6 w-6 text-green-500 flex-shrink-0 mr-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link 
                href={plan.buttonLink} 
                className={`w-full py-3 px-6 rounded-xl text-center font-semibold transition-colors duration-200 ${
                  plan.isPopular 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' 
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                {plan.buttonText}
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ Section (Great for SEO) */}
        <div className="mt-32 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Frequently Asked Questions</h2>
          <div className="space-y-8">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Can I cancel my subscription at any time?</h4>
              <p className="mt-2 text-gray-600">Yes, you can cancel your subscription at any time from your account dashboard. You will retain access to your plan features until the end of your billing cycle.</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">What happens when I run out of AI generations?</h4>
              <p className="mt-2 text-gray-600">On the Starter plan, you will need to wait until the next month to get more credits, or you can upgrade to the Creator plan for unlimited generations.</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Do you offer refunds?</h4>
              <p className="mt-2 text-gray-600">We offer a 7-day money-back guarantee for all new subscriptions. If you are not satisfied, simply contact our support team.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
    </div>
  );
}