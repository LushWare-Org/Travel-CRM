import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { fetchPackages } from '../../../services/api/packages';
import type { AggregatedDestination } from '../../../services/api/packages.transform';
import InternationalGrid from './InternationalGrid';
import { Button } from '@/components/ui/button';

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
      <section className="relative overflow-hidden bg-gradient-to-b from-gray-50 to-white py-section-lg">
        <div className="relative z-raised mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-display text-3xl font-bold text-gray-900 md:text-4xl">Explore the World Without Limits</h2>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-600">Exclusive international packages made for comfort, class & unforgettable moments</p>
          </div>
          <InternationalGrid destinations={destinations} loading={loading} />
          <div className="mt-10 text-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/destinations-international')}
              className="h-12 w-full rounded-xl border-2 border-gray-900 bg-transparent px-8 font-semibold text-gray-900 transition-colors duration-300 hover:border-brand-600 hover:bg-brand-50 hover:text-brand-700 focus-visible:border-brand-600 focus-visible:ring-brand-600/40 sm:w-auto"
            >
              Explore All Locations
              <ArrowRight className="size-5" />
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}
