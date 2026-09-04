import { Link } from 'react-router-dom';
import { Leaf, HeartHandshake, Recycle } from 'lucide-react';

const VALUES = [
  {
    icon: Leaf,
    title: 'Carbon-Conscious Itineraries',
    description:
      "We prioritize local transport, low-impact stays, and operators who protect the ecosystems you'll explore.",
  },
  {
    icon: HeartHandshake,
    title: 'Community-Rooted Partners',
    description:
      'A share of every booking supports the local guides, artisans, and conservation projects we work with.',
  },
  {
    icon: Recycle,
    title: 'Responsible by Design',
    description:
      'From paperless documents to plastic-free excursions, sustainability is built into every itinerary, not bolted on.',
  },
];

export default function SustainabilityStrip() {

  return (
    <section className="py-section-md bg-brand-50 font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-display">
            Travel That Gives Back
          </h2>
          <p className="text-lg text-gray-600">
            Every Lushware journey is designed with the places — and people — we visit in mind.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="relative h-80 md:h-96 mb-16 md:mb-0">
            <div className="absolute top-0 left-0 w-4/5 h-4/5 rounded-3xl overflow-hidden shadow-xl">
              <img
                src="/lush/about/sustainability.jpg"
                alt="Sustainable travel"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-8 -right-4 md:right-0 w-3/5 h-3/5 rounded-2xl overflow-hidden shadow-2xl border-4 border-white">
              <img
                src="/lush/about/culture.jpg"
                alt="Local culture"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div>
            <div className="space-y-8">
              {VALUES.map((value) => (
                <div key={value.title} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center">
                    <value.icon className="w-6 h-6 text-brand-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 font-display">
                      {value.title}
                    </h3>
                    <p className="text-gray-600">{value.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/about"
              className="inline-block mt-8 font-semibold text-brand-700 hover:text-brand-800 transition-colors"
            >
              Read Our Sustainability Commitment →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
