import { useEffect, useState } from 'react';
import { PARTNERS } from '../../content/partners';

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
    <section className="py-10 relative overflow-hidden font-opensans">
      <div className="max-w-8xl mx-auto lg:px-8 relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 font-poppins">
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
                  <div className="relative bg-white rounded-2xl p-8 shadow-xl border border-gray-100 h-full mx-3">
                    <div className="relative mb-6 h-16 flex items-center justify-center">
                      <img
                        src={partner.logo}
                        alt={partner.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-bold bg-gradient-to-r from-brand-600 to-brand-accent-600 bg-clip-text text-transparent font-poppins">
                        {partner.name}
                      </h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}