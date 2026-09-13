import { ArrowRight } from 'lucide-react';
import PORTALS from '../config/portals';

export default function CtaBanner() {
  return (
    <section id="contact" className="py-20 md:py-24">
      <div className="max-w-6xl mx-auto px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-primary-800 px-8 py-14 md:px-16 md:py-16 text-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10"
          />

          <h2 className="relative text-3xl md:text-4xl font-extrabold text-white">
            Ready to modernize your travel business?
          </h2>
          <p className="relative mt-4 max-w-xl mx-auto text-primary-50">
            Sign in to your Management Portal, or send your travelers to the Client site to start
            exploring packages today.
          </p>

          <div className="relative mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={PORTALS.management.url}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-semibold text-brand hover:bg-primary-50 transition-colors"
            >
              Open Management Portal
              <ArrowRight size={18} />
            </a>
            <a
              href={PORTALS.client.url}
              className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/60 px-7 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Visit Client Site
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
