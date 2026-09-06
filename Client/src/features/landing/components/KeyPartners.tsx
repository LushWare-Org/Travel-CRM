import { useEffect, useState } from 'react';
import { PARTNERS } from '../../../content/partners';

export default function KeyPartnersSection() {
  const [offset, setOffset] = useState(0);
  const cardWidth = 236;
  const totalWidth = PARTNERS.length * cardWidth;
  const duplicatedPartners = [...PARTNERS, ...PARTNERS, ...PARTNERS, ...PARTNERS];

  useEffect(() => {
    const interval = setInterval(() => {
      setOffset((prev) => {
        const newOffset = prev - 1;
        if (Math.abs(newOffset) >= totalWidth * 2) {
          return 0;
        }
        return newOffset;
      });
    }, 20);

    return () => clearInterval(interval);
  }, [totalWidth]);

  return (
    <section className="relative overflow-hidden bg-gray-50 py-section-md font-body">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative z-raised mb-8 text-center">
          <h2 className="mb-4 font-display text-3xl font-bold text-gray-900 md:text-5xl">
           Our Trusted Travel Partners
          </h2>
        </div>
        <div className="relative">
          <div className="overflow-hidden py-4">
            <div
              className="flex"
              style={{
                transform: `translateX(${offset}px)`,
                transition: 'none',
                width: `${duplicatedPartners.length * cardWidth}px`,
              }}
            >
              {duplicatedPartners.map((partner, idx) => (
                <div
                  key={idx}
                  className="flex flex-shrink-0 items-center justify-center"
                  style={{ width: `${cardWidth}px` }}
                >
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="mx-3 max-h-10 opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
                  />
                </div>
              ))}
            </div>
          </div>
          {/* Edge fades — logos drift out of the band cleanly on every width. */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-raised w-16 bg-gradient-to-r from-gray-50 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-raised w-16 bg-gradient-to-l from-gray-50 to-transparent" />
        </div>
      </div>
    </section>
  );
}
