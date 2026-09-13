import {
  Users2,
  MapPinned,
  CalendarCheck2,
  Receipt,
  PlaneTakeoff,
  BarChart3,
  Briefcase,
  BellRing,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Users2,
    title: 'Lead Management',
    description: 'Capture inquiries from every channel and track each one through your sales pipeline to close.',
  },
  {
    icon: MapPinned,
    title: 'Package & Itinerary Builder',
    description: 'Design multi-day itineraries with rich activities, images and pricing your team can reuse and quote.',
  },
  {
    icon: CalendarCheck2,
    title: 'Bookings & Payments',
    description: 'Confirm bookings and take secure payments without leaving the platform your team already works in.',
  },
  {
    icon: Receipt,
    title: 'Quotations & Billing',
    description: 'Generate polished PDF quotations and invoices automatically, with a full billing history per client.',
  },
  {
    icon: PlaneTakeoff,
    title: 'Flight Search',
    description: 'Search and attach flights to an itinerary directly, keeping travel plans in one place.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Reporting',
    description: 'See conversion, revenue and team performance at a glance with dashboards built for decisions.',
  },
  {
    icon: BellRing,
    title: 'Automated Notifications',
    description: 'Keep leads and travelers in the loop with timely, automatic updates at every stage of their journey.',
  },
  {
    icon: Briefcase,
    title: 'Careers & HR',
    description: 'Post openings and manage applications for your agency, right alongside your customer-facing tools.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl">
          <span className="text-sm font-semibold uppercase tracking-wide text-brand">Platform features</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-slate-900">
            Everything a modern travel agency needs
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Every module is connected, so a lead captured today becomes a quotation, a booking and a
            paying customer without re-entering a single detail.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-brand group-hover:bg-brand group-hover:text-white transition-colors">
                <Icon size={24} />
              </span>
              <h3 className="mt-5 font-poppins font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
