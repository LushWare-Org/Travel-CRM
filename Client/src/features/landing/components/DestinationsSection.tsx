import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { fetchPackages } from '../../../services/api/packages';
import type { AggregatedDestination } from '../../../services/api/packages.transform';
import InternationalGrid from './InternationalGrid';
import ReviewsVideoSlider from './ReviewsVideoSlider';
import { isLushTheme } from '../../../config/activeTheme';

export default function DestinationsSection() {
  const navigate = useNavigate();
  const [destinations, setDestinations] = useState<AggregatedDestination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchPackages({ limit: 100 })
      .then(({ destinations: dest }) => { if (mounted) setDestinations(dest) })
      .catch(() => { if (mounted) setDestinations([]) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, []);

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white">
      <style>{`
        /* Prevent horizontal overflow on tablets */
        @media (min-width: 768px) and (max-width: 1366px) {
          * {
            overflow-x: hidden;
          }
          body {
            overflow-x: hidden;
          }
        }
      `}</style>
      {/* Destinations Section */}
      <section className={`${isLushTheme ? 'py-section-lg' : 'py-28'} bg-gradient-to-b from-gray-50 to-white relative overflow-hidden`}>
        <div className="max-w-[1350px] mx-auto px-4 sm:px-6 lg:px-8 relative z-raised">
          <div className="mb-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Explore the World Without Limits</h2>
            <p className="text-lg text-gray-600">Exclusive international packages made for comfort, class & unforgettable moments</p>
          </div>
          <InternationalGrid destinations={destinations} loading={loading} />
          <div className="text-center mt-8">
            <button onClick={() => navigate("/destinations-international")} className="group inline-flex items-center justify-center px-10 py-3.5 text-slate-800 font-semibold text-base tracking-wide border-2 border-slate-800 rounded-lg hover:border-brand-400 transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
              <span className="group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-brand-800 group-hover:to-brand-accent-700 group-hover:bg-clip-text transition-all duration-300">
                Explore All Locations
              </span>
              <ArrowRight className="ml-2 w-5 h-5 group-hover:text-brand-500 transition-colors duration-300" />
            </button>
          </div>
        </div>
      </section>

      {!isLushTheme && <ReviewsVideoSlider />}
    </div>
  );
}
