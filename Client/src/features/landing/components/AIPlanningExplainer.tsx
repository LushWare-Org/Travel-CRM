import { Link } from 'react-router-dom';
import { MessageSquareText, Sparkles, CalendarCheck } from 'lucide-react';

const STEPS = [
  {
    icon: MessageSquareText,
    title: 'Tell Us Your Dream Trip',
    description: 'Share your destinations, dates, budget, and travel style.',
  },
  {
    icon: Sparkles,
    title: 'AI Builds Your Itinerary',
    description: 'Our planner instantly drafts a day-by-day journey tailored to you.',
  },
  {
    icon: CalendarCheck,
    title: 'Refine & Book with an Expert',
    description: 'Fine-tune every detail, then let our travel specialists make it real.',
  },
];

export default function AIPlanningExplainer() {

  return (
    <section className="py-section-md bg-white font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-display">
            Plan Smarter, Travel Better
          </h2>
          <p className="text-lg text-gray-600">
            Our AI itinerary planner turns your ideas into a ready-to-book journey in minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step) => (
            <div key={step.title} className="text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center mb-4">
                <step.icon className="w-7 h-7 text-brand-700" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 font-display">
                {step.title}
              </h3>
              <p className="text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            to="/planner"
            className="inline-flex items-center justify-center px-8 py-3.5 bg-gradient-to-r from-brand-500 to-brand-accent-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
          >
            Try the AI Planner
          </Link>
        </div>
      </div>
    </section>
  );
}
