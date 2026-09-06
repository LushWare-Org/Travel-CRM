import { Link } from 'react-router-dom';
import { Check, HeartHandshake, Leaf, Recycle, Star } from 'lucide-react';
import { TRUST_STATS, getTrustHeadline, TAGLINE } from '../../../content/aboutSection';
import { WHY_CHOOSE_US_ITEMS, type WhyChooseUsItem } from '../../../content/whyChooseUs';
import BRANDING from '../../../config/branding';

// Content preserved verbatim from SustainabilityStrip.tsx (Travel That Gives Back).
const SUSTAINABILITY_VALUES = [
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

// The four trust figures, derived from the same TRUST_STATS source AboutSection.tsx
// animated (100 / 24 / 100 / 11000). Rendered statically: a mount-triggered count-up
// is not one of the three sanctioned motion patterns (Client/DESIGN.md - Motion Budget).
const TRUST_STATS_DISPLAY = [
  { value: `${TRUST_STATS.customisation}%`, label: 'Easy Booking' },
  { value: `${TRUST_STATS.concierge}x7`, label: 'On Trip Support' },
  { value: `${TRUST_STATS.visaSuccess}%`, label: 'Satisfaction Rate' },
  { value: `${TRUST_STATS.travelers.toLocaleString()}+`, label: 'Happy Customers' },
];

// One image carries the curated-travel story (WhyChooseUs.tsx used three alternating
// rows). The local-guide photo is the trust differentiator for the booking funnel.
const CURATION_IMAGE_TITLE = 'Guided by Local Experts';

function isImageMedia(media: WhyChooseUsItem['media']): media is { kind: 'image'; src: string } {
  return media.kind === 'image';
}

/**
 * Consolidated trust section (Phase 2 of docs/CLIENT-REWAMP-PLAN.md, section map:
 * SustainabilityStrip + AboutSection + WhyChooseUs merge into one section).
 *
 * Internal rhythm is deliberately varied so the section does not read as a fourth
 * instance of the "icon in colored circle + heading + 2-line description x3" pattern:
 *   1. a full-bleed deep-green stat banner (headline + Google rating + 4 figures),
 *   2. one image/text block for the expert-curation message (plain check-list rows,
 *      no circle chips),
 *   3. a compact icon + label row on a brand-50 band for the three sustainability
 *      values, closing with the /about cross-link.
 */
export default function TrustSection() {
  const curationItem = WHY_CHOOSE_US_ITEMS.find((item) => item.title === CURATION_IMAGE_TITLE);
  const curationImage = curationItem && isImageMedia(curationItem.media) ? curationItem.media : undefined;

  return (
    <section aria-labelledby="trust-section-title" className="font-body">
      {/* 1 — Trust stats (dark band). Scannable proof first: it answers "why choose
          us?" in one glance for a first-time visitor. */}
      <div className="bg-brand-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 lg:py-20 text-center">
          <h2 id="trust-section-title" className="text-3xl md:text-4xl font-bold text-white">
            {getTrustHeadline(BRANDING.company.name)}
          </h2>
          <p className="mt-4 text-white/85 text-base md:text-lg max-w-2xl mx-auto">{TAGLINE}</p>

          {/* Google rating pill — in-flow badge on the dark canvas, so it is elevated
              by the border/contrast recipe, not a shadow (DESIGN.md - Elevation). */}
          <div
            role="img"
            aria-label="Rated 4.9 out of 5 on Google"
            className="mt-8 inline-flex items-center gap-2.5 bg-white rounded-full pl-4 pr-5 py-2 border border-white/10"
          >
            <svg aria-hidden="true" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-gray-900 font-bold text-base">4.9</span>
            <span className="flex" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className="w-4 h-4 text-brand-accent-400 fill-brand-accent-400" />
              ))}
            </span>
          </div>

          {/* Mobile: 2x2 grid of large figures (readable, scannable). From md the four
              figures sit in one row; numerals step down at sm/md so "11,000+" never
              crowds a ~150px cell (tablet portrait keeps the 2x2 on purpose). */}
          <div className="mt-12 md:mt-14 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 md:gap-x-8">
            {TRUST_STATS_DISPLAY.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display text-4xl lg:text-5xl font-bold text-white">{stat.value}</div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-white/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2 — Expert curation (white canvas). One image/text row, not a 3-icon grid:
          photo hook left on desktop, stacked image-then-text on mobile to match the
          natural reading order of the previous band's center-out scan. */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid md:grid-cols-2 gap-10 md:gap-12 lg:gap-16 items-center">
            <div>
              {curationImage && curationItem && (
                <div className="aspect-[4/3] overflow-hidden rounded-2xl">
                  <img
                    src={curationImage.src}
                    alt={curationItem.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
            </div>

            <div>
              <p className="text-lg text-gray-600 leading-relaxed">
                We believe in creating unforgettable memories through perfectly curated travel experiences.
              </p>
              <ul className="mt-8 space-y-6">
                {WHY_CHOOSE_US_ITEMS.map((item) => (
                  <li key={item.title} className="flex gap-4">
                    <Check aria-hidden="true" className="mt-1.5 w-5 h-5 text-brand-600 shrink-0" strokeWidth={3} />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                      <p className="mt-1 text-gray-600 leading-relaxed">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 3 — Sustainability values (brand-50 band). Compact icon + label rows — each
          value stays a horizontal chip row at every breakpoint (3-up from lg), never
          a centered icon-circle column grid. */}
      <div className="bg-brand-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 lg:py-20">
          <div className="text-center">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900">Travel That Gives Back</h3>
            <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
              Every Lushware journey is designed with the places — and people — we visit in mind.
            </p>
          </div>

          <div className="mt-10 lg:mt-12 grid gap-8 lg:grid-cols-3 lg:gap-10">
            {SUSTAINABILITY_VALUES.map((value) => (
              <div key={value.title} className="flex gap-4">
                <div className="w-11 h-11 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                  <value.icon className="w-5 h-5 text-brand-700" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{value.title}</h4>
                  <p className="mt-1 text-gray-600 leading-relaxed">{value.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 lg:mt-12 text-center">
            <Link
              to="/about"
              className="inline-block font-semibold text-brand-600 hover:text-brand-700 transition-colors"
            >
              Read Our Sustainability Commitment →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
