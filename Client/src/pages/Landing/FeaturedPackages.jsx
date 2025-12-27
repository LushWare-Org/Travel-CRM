import { Link, useNavigate } from 'react-router-dom';
import { Clock, Star, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

export default function FeaturedPackages({ packages }) {
  const navigate = useNavigate();
    const latestPackages = packages
    .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt))
    .slice(0, 3);
  
  const featuredPackages = latestPackages.length > 0 ? latestPackages : packages.slice(0, 3);

  return (
    <section className="py-16 bg-gray-50 font-opensans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-poppins">
           Featured Packages You’ll Love
          </h2>
          <p className="text-lg text-gray-600">
            Unique itineraries, top deals, and traveller favourite getaways - all in one place.
          </p>
        </div>
        {featuredPackages.length === 0 ? (
          <div className="text-center py-12 text-gray-600 bg-white rounded-2xl border-2 border-gray-200">
            <p>No packages available yet. Please check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredPackages.map((pkg) => (
              <Link 
                key={pkg.id} 
                to={`/package/${pkg.id}`} 
                className="group bg-white rounded-2xl overflow-hidden border-2 border-gray-200 hover:border-yellow-500 hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              >
                <div className="relative overflow-hidden aspect-[4/3]">
                  <img 
                    src={pkg.image_url || pkg.images?.[0]} 
                    alt={pkg.title} 
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10"></div>
                    <div className="absolute top-0 left-0 right-0 p-6 text-white">
                    <div className="flex justify-between items-start">
                      <div>
                      </div>
                      <div>
                        <span className="inline-block bg-yellow-500/90 text-black px-3 py-1 rounded-full text-xs font-bold mb-2">FEATURED</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bottom info display */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm">{pkg.duration_days} Days</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="absolute inset-0 p-6 text-white flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <h4 className="text-lg font-bold mb-3 text-yellow-400">What's Included:</h4>
                    <ul className="text-md space-y-2">
                      {pkg.inclusions && pkg.inclusions.slice(0, 5).map((inclusion, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-yellow-400 mr-2">✓</span>
                          <span className="line-clamp-1">{inclusion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-yellow-600 transition-colors font-poppins">
                    {pkg.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-6 line-clamp-2">{pkg.description}</p>
                  <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200">
                   <div>
                      <div className="text-2xl font-bold text-orange-600 font-poppins">
                        {formatCurrency(pkg.price_from)}
                    </div>
                    </div>
                    <button className="px-6 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gradient-to-r hover:from-yellow-600 hover:to-orange-600 hover:shadow-lg transition-all duration-300 font-opensans">
                      View Details
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="text-center mt-12">
        <button 
          onClick={() => navigate('/packages')}
          className="group inline-flex items-center justify-center px-10 py-3.5 text-slate-800 font-semibold text-base tracking-wide border-2 border-slate-800 rounded-lg hover:border-orange-400 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
        >
          <span className="group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-orange-800 group-hover:to-yellow-700 group-hover:bg-clip-text transition-all duration-300">
            Explore All Packages
          </span>
          <ArrowRight className="ml-2 w-5 h-5 group-hover:text-orange-500 transition-colors duration-300" />
        </button>
      </div>
    </section>
  );
}