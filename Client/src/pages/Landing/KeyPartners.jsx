import { useEffect, useState } from 'react';

const partners = [
  { name: 'Booking.com', logo: 'https://logos-world.net/wp-content/uploads/2021/08/Booking-Logo.png', category: 'Accommodation Partner' },
  { name: 'Agoda', logo: 'https://logos-world.net/wp-content/uploads/2022/04/Agoda-Logo.png', category: 'Travel Platform' },
  { name: 'Expedia', logo: 'https://logos-world.net/wp-content/uploads/2020/11/Expedia-Logo.png', category: 'Travel Booking' },
  { name: 'TripAdvisor', logo: 'https://logos-world.net/wp-content/uploads/2020/11/Tripadvisor-Logo.png', category: 'Reviews & Insights' },
  { name: 'Airbnb', logo: 'https://logos-world.net/wp-content/uploads/2020/10/Airbnb-Logo.png', category: 'Accommodation' },
  { name: 'Mastercard', logo: 'https://logos-world.net/wp-content/uploads/2020/09/Mastercard-Logo.png', category: 'Payment Partner' },
  { name: 'Visa', logo: 'https://logos-world.net/wp-content/uploads/2020/07/Visa-Logo.png', category: 'Payment Partner' },
  { name: 'PayPal', logo: 'https://logos-world.net/wp-content/uploads/2020/07/PayPal-Logo.png', category: 'Payment Partner' },
  { name: 'American Express', logo: 'https://logos-world.net/wp-content/uploads/2020/09/American-Express-Logo.png', category: 'Payment Partner' },
  { name: 'Hotels.com', logo: 'https://logos-world.net/wp-content/uploads/2022/04/Hotelscom-Logo.png', category: 'Accommodation' },
];

export default function KeyPartnersSection() {
  const [offset, setOffset] = useState(0);
  const cardWidth = 236;
  const totalWidth = partners.length * cardWidth;
  const duplicatedPartners = [...partners, ...partners, ...partners, ...partners];

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
                      <h3 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-yellow-600 bg-clip-text text-transparent font-poppins">
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