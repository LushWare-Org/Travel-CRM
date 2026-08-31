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
    <section className="py-section-sm relative overflow-hidden font-body">
      <div className="max-w-8xl mx-auto lg:px-8 relative z-raised">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 font-display">
           Our Trusted Travel Partners
          </h2>
        </div>
        <div className="relative">
          <div className="overflow-hidden py-8">
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
                  className="flex-shrink-0"
                  style={{ width: `${cardWidth}px` }}
                >
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="max-h-10 mx-3 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
