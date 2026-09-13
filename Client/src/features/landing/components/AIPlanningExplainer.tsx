import { Link } from 'react-router-dom';
import { MessageSquareText, Sparkles, CalendarCheck } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    <section className="bg-white py-section-md font-body">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="mb-4 font-display text-3xl font-bold text-gray-900 md:text-4xl">
            Plan Smarter, Travel Better
          </h2>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-600">
            Our AI itinerary planner turns your ideas into a ready-to-book journey in minutes.
          </p>
        </div>

        {/* Numbered step tiles — deliberately not another centered icon-circle
            grid: editorial Fraunces numerals + left-aligned icon tiles give
            the three steps their own reading rhythm (see DESIGN.md). */}
        <ol className="grid gap-5 md:grid-cols-3 md:gap-6">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-6 md:p-8"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-1 -top-7 select-none font-display text-[5.5rem] font-bold leading-none text-brand-100"
              >
                {index + 1}
              </span>
              <div className="relative flex h-full flex-col">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                    <step.icon className="size-5" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                    Step {index + 1}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12 text-center">
          <Link
            to="/planner"
            className={cn(
              buttonVariants({ variant: 'default', size: 'lg' }),
              'h-12 rounded-xl bg-brand-600 px-8 font-semibold text-white transition-colors duration-300 hover:bg-brand-700'
            )}
          >
            Try the AI Planner
          </Link>
        </div>
      </div>
    </section>
  );
}
