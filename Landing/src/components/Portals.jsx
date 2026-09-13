import { ArrowUpRight, LayoutDashboard, Luggage } from 'lucide-react';
import PORTALS from '../config/portals';

const CARDS = [
  {
    icon: LayoutDashboard,
    eyebrow: 'For your team',
    title: PORTALS.management.name,
    description:
      'The command center for your agency: manage leads, build packages, confirm bookings, send invoices and track performance.',
    bullets: ['Lead & sales pipeline', 'Itinerary & pricing tools', 'Billing and analytics dashboards'],
    url: PORTALS.management.url,
    cta: 'Go to Management Portal',
    accent: 'from-brand to-primary-700',
  },
  {
    icon: Luggage,
    eyebrow: 'For your customers',
    title: PORTALS.client.name,
    description:
      'A branded, self-service site where travelers browse packages, request custom trips and manage their own bookings.',
    bullets: ['Browse packages & destinations', 'Request a custom itinerary', 'Track bookings and payments'],
    url: PORTALS.client.url,
    cta: 'Visit Client Site',
    accent: 'from-sky-500 to-cyan-600',
  },
];

export default function Portals() {
  return (
    <section id="portals" className="py-20 md:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl">
          <span className="text-sm font-semibold uppercase tracking-wide text-brand">Two portals, one platform</span>
          <h2 className="mt-3 text-3xl md:text-4xl font-extrabold text-slate-900">
            Built for both sides of the journey
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Your staff and your travelers each get an experience designed around what they need to do.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          {CARDS.map((card) => (
            <a
              key={card.title}
              href={card.url}
              className="group relative overflow-hidden rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-100 hover:shadow-2xl transition-shadow"
            >
              <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${card.accent}`} />

              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-brand">
                <card.icon size={26} />
              </span>

              <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-400">{card.eyebrow}</p>
              <h3 className="mt-2 flex items-center gap-2 text-2xl font-poppins font-bold text-slate-900">
                {card.title}
                <ArrowUpRight size={20} className="text-brand opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </h3>
              <p className="mt-3 text-slate-600">{card.description}</p>

              <ul className="mt-6 space-y-2">
                {card.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                    {bullet}
                  </li>
                ))}
              </ul>

              <span className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
                {card.cta}
                <ArrowUpRight size={16} />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
