import { useEffect, useRef } from 'react';
import { Check, Star } from 'lucide-react';

export default function WhyChooseUs() {
  const whyRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {});
        } else {
          if (!videoRef.current?.paused) videoRef.current?.pause();
        }
      },
      { threshold: 0.5 }
    );
    if (whyRef.current) observer.observe(whyRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-20 bg-[#012a4a] relative overflow-hidden font-opensans" ref={whyRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-poppins">
              Why Travel With Us?
            </h2>
            <p className="text-xl text-gray-300 mb-10">
              We believe in creating unforgettable memories through perfectly curated travel experiences.
            </p>
            <div className="space-y-5">
              {['Personalized Itineraries', 'Expert Local Guides', 'Best Price Guarantee', '24/7 Customer Support'].map((item, idx) => (
                <div key={idx} className="flex items-start space-x-4 group">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1 font-poppins">{item}</h3>
                    <p className="text-gray-300 text-md">
                      {idx === 0 && 'Every journey is uniquely crafted to match your dreams and preferences'}
                      {idx === 1 && 'Connect with authentic experiences through our expert local guides'}
                      {idx === 2 && 'Transparent pricing with no hidden fees—your trust matters to us'}
                      {idx === 3 && 'Round-the-clock assistance ensures you are never alone on your journey'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 lg:order-2 relative">
            <div className="relative overflow-hidden rounded-3xl shadow-2xl h-[500px]">
              <video
                ref={videoRef}
                src="/v4.mp4"
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
                autoPlay
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
            </div>
            <div className="absolute -bottom-4 md:-bottom-8 -left-2 md:-left-8 bg-white rounded-2xl shadow-2xl p-4 md:p-6 max-w-xs">
              <div className="flex items-center space-x-3 md:space-x-4 mb-2 md:mb-3">
                <div className="w-12 md:w-16 h-12 md:h-16 bg-gradient-to-r from-green-400 via-green-200 to-green-400 rounded-xl flex items-center justify-center">
                  <Star className="w-6 md:w-8 h-6 md:h-8 text-white fill-current" />
                </div>
                <div>
                  <div className="text-2xl md:text-3xl font-bold text-gray-900 font-poppins">11,000+</div>
                  <div className="text-xs md:text-sm text-gray-600">Happy Customers</div>
                </div>
              </div>
              <p className="text-gray-700 text-xs md:text-sm font-medium">Plan your holiday with Trip Sky Way</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}