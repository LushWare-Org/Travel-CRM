import { MapPin, Phone, Mail, Facebook, Instagram, Twitter, Youtube } from 'lucide-react';

export default function Footer({ onNavigate }) {
  return (
    <footer className="bg-gray-900 text-gray-300 font-opensans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <img src="/logo.png" alt="Trip Sky Way Logo" className="h-12 w-auto" />
              <div className="ml-3">
              </div>
            </div>
            <p className="text-sm mb-4">
              Creating unforgettable travel experiences worldwide. Your trusted partner for international and domestic holidays since 2010.
            </p>
            <div className="flex gap-3">
              <a href="https://www.facebook.com/tripskyway" target="_blank" rel="noopener noreferrer" className="bg-gray-800 p-2 rounded-lg hover:bg-yellow-600 transition">
                <Facebook size={18} />
              </a>
              <a href="https://www.instagram.com/tripskyway" target="_blank" rel="noopener noreferrer" className="bg-gray-800 p-2 rounded-lg hover:bg-yellow-600 transition">
                <Instagram size={18} />
              </a>
            </div>
          </div>

          <div className="lg:ml-16">
            <h4 className="text-white font-semibold mb-4 font-poppins">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-yellow-400 transition">
                  Home
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('packages')} className="hover:text-yellow-400 transition">
                  Holiday Packages
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('planner')} className="hover:text-yellow-400 transition">
                  Plan Your Trip
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-yellow-400 transition">
                  About Us
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-yellow-400 transition">
                  Contact
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 font-poppins">Destination Types</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => onNavigate('destinations-international')} className="hover:text-yellow-400 transition">
                  International Destinations
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('destinations-domestic')} className="hover:text-yellow-400 transition">
                  Domestic Destinations
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 font-poppins">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin size={18} className="mt-0.5 flex-shrink-0 text-yellow-400" />
                <span>2/73, near Gurudwara, Lalita Park, Laxmi Nagar, New Delhi, Delhi, 110092</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={18} className="flex-shrink-0 text-yellow-400" />
                <a href="tel:+919876543210" className="hover:text-yellow-400 transition">
                  +91 98765 43210
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={18} className="flex-shrink-0 text-yellow-400" />
                <a href="mailto:info@travelagency.com" className="hover:text-yellow-400 transition">
                  info@tripskyway.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p>&copy; 2025 TripSkyWay. All rights reserved.</p>
            <div className="flex gap-6">
              <button onClick={() => onNavigate('privacy-policy')} className="hover:text-yellow-400 transition">Privacy Policy</button>
              <button onClick={() => onNavigate('terms-of-service')} className="hover:text-yellow-400 transition">Terms of Service</button>
              <button onClick={() => onNavigate('cancellation-policy')} className="hover:text-yellow-400 transition">Cancellation Policy</button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}