import { ArrowRight, ShieldCheck, Workflow, Users } from 'lucide-react';
import PORTALS from '../config/portals';

const HIGHLIGHTS = [
  { icon: Workflow, label: 'One platform, end to end' },
  { icon: ShieldCheck, label: 'Secure, role-based access' },
  { icon: Users, label: 'Built for agencies & travelers' },
];

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-gradient-to-b from-primary-50 via-white to-white pt-32 pb-20 md:pt-40 md:pb-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-0 h-[28rem] w-[28rem] rounded-full bg-primary-200/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 h-[24rem] w-[24rem] rounded-full bg-sky-200/40 blur-3xl"
      />

      <div className="relative max-w-7xl mx-auto px-6 grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="inline-flex items-center rounded-full bg-primary-100 px-4 py-1.5 text-sm font-semibold text-brand">
            The operating system for travel agencies
          </span>
          <h1 className="mt-6 text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-slate-900">
            Run your travel business,{' '}
            <span className="text-brand">delight every traveler</span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-xl">
            LushTravelCloud brings leads, itineraries, bookings, billing and analytics into one
            connected platform — with a dedicated portal for your team and a self-service site
            for your customers.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <a
              href={PORTALS.management.url}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-7 py-3.5 text-base font-semibold text-white shadow-glow hover:bg-primary-700 transition-colors"
            >
              Open Management Portal
              <ArrowRight size={18} />
            </a>
            <a
              href={PORTALS.client.url}
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-slate-200 bg-white px-7 py-3.5 text-base font-semibold text-slate-800 hover:border-brand hover:text-brand transition-colors"
            >
              Explore the Client Site
              <ArrowRight size={18} />
            </a>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <Icon size={18} className="text-brand" />
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl shadow-slate-200/60">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <p className="font-poppins font-semibold text-slate-800">Agency Dashboard</p>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Live
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4">
              {[
                { label: 'New leads', value: '128' },
                { label: 'Quotations sent', value: '64' },
                { label: 'Bookings this week', value: '37' },
                { label: 'Revenue tracked', value: 'Real-time' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-3">
              {['Lead assigned to sales rep', 'Itinerary quotation generated', 'Payment confirmed for booking #4821'].map(
                (item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl bg-primary-50 px-4 py-3 text-sm text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-brand" />
                    {item}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
