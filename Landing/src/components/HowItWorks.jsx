const STEPS = [
  {
    step: '01',
    title: 'Capture the lead',
    description: 'Inquiries from your website, calls or walk-ins land in one shared pipeline your sales team owns.',
  },
  {
    step: '02',
    title: 'Quote an itinerary',
    description: 'Build a day-by-day itinerary from your package catalog and send a branded quotation in minutes.',
  },
  {
    step: '03',
    title: 'Book & get paid',
    description: 'Confirm the booking and collect payment, with an invoice generated automatically.',
  },
  {
    step: '04',
    title: 'Delight the traveler',
    description: 'Your customer manages their trip from the Client Portal, and everything syncs back to your team.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl">
          <span className="text-sm font-semibold uppercase tracking-wide text-brand">How it works</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-slate-900">
            From first inquiry to a happy traveler
          </h2>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ step, title, description }, index) => (
            <div key={step} className="relative pl-2">
              <span className="font-poppins text-5xl font-extrabold text-primary-100">{step}</span>
              <h3 className="mt-3 font-poppins font-semibold text-lg text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
              {index < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="hidden lg:block absolute top-6 right-[-1.25rem] h-px w-8 bg-slate-200"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
