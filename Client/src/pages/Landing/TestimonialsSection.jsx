import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function TestimonialsSection() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [visible, setVisible] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setVisible(width < 768 ? 1 : width < 1024 ? 2 : 3);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://elfsightcdn.com/platform.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);


  return (
    <>
      {/* Google Reviews */}
      <section className="py-20 bg-white font-opensans">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-poppins">
              Loved by Travelers Across the Globe
            </h2>
            <p className="text-lg text-gray-600">
              Honest reviews from clients who’ve explored the world with us
            </p>
          </div>
          <div className="flex justify-center">
            <div 
              className="elfsight-app-73d66682-048c-42cd-bfa6-d33c02611cb3" 
              data-elfsight-app-lazy
            ></div>
          </div>
        </div>
      </section>
    </>
  );
}