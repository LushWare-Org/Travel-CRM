import { MapPin, Phone, Mail, Facebook, Instagram, Twitter, Youtube } from 'lucide-react';
import BRANDING, { getCopyrightText } from '../config/branding';

export default function Footer({ onNavigate }) {
  return (
    <footer className="bg-gray-900 text-gray-300 font-opensans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-4">
              <img src="/logo.png" alt={`${BRANDING.company.name} Logo`} className="h-12 w-auto" />
              <div className="ml-3">
              </div>
            </div>
            <p className="text-sm mb-4">
              {`Creating unforgettable travel experiences worldwide. Your trusted partner for international holidays since ${BRANDING.company.foundedYear}.`}
            </p>
            <div className="flex gap-3">
              {BRANDING.social.facebook && (
                <a href={BRANDING.social.facebook} target="_blank" rel="noopener noreferrer" className="bg-gray-800 p-2 rounded-lg hover:bg-brand-accent-600 transition">
                  <Facebook size={18} />
                </a>
              )}
              {BRANDING.social.instagram && (
                <a href={BRANDING.social.instagram} target="_blank" rel="noopener noreferrer" className="bg-gray-800 p-2 rounded-lg hover:bg-brand-accent-600 transition">
                  <Instagram size={18} />
                </a>
              )}
              {BRANDING.social.twitter && (
                <a href={BRANDING.social.twitter} target="_blank" rel="noopener noreferrer" className="bg-gray-800 p-2 rounded-lg hover:bg-brand-accent-600 transition">
                  <Twitter size={18} />
                </a>
              )}
              {BRANDING.social.youtube && (
                <a href={BRANDING.social.youtube} target="_blank" rel="noopener noreferrer" className="bg-gray-800 p-2 rounded-lg hover:bg-brand-accent-600 transition">
                  <Youtube size={18} />
                </a>
              )}
            </div>
          </div>

          <div className="lg:ml-16">
            <h4 className="text-white font-semibold mb-4 font-poppins">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-brand-accent-400 transition">
                  Home
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('packages')} className="hover:text-brand-accent-400 transition">
                  Holiday Packages
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('planner')} className="hover:text-brand-accent-400 transition">
                  Plan Your Trip
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('career')} className="hover:text-brand-accent-400 transition">
                  Career
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-brand-accent-400 transition">
                  About Us
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-brand-accent-400 transition">
                  Contact
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 font-poppins">Destinations</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button onClick={() => onNavigate('destinations-international')} className="hover:text-brand-accent-400 transition">
                  International Destinations
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 font-poppins">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin size={18} className="mt-0.5 flex-shrink-0 text-brand-accent-400" />
                <span>{BRANDING.contact.address}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={18} className="flex-shrink-0 text-brand-accent-400" />
                <a href={`tel:${BRANDING.contact.phone}`} className="hover:text-brand-accent-400 transition">
                  {BRANDING.contact.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={18} className="flex-shrink-0 text-brand-accent-400" />
                <a href={`mailto:${BRANDING.contact.email}`} className="hover:text-brand-accent-400 transition">
                  {BRANDING.contact.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p>{getCopyrightText()}</p>
            <div className="flex gap-6">
              {BRANDING.legal.privacyUrl && (
                <a href={BRANDING.legal.privacyUrl} target="_blank" rel="noopener noreferrer" className="hover:text-brand-accent-400 transition">Privacy Policy</a>
              )}
              {BRANDING.legal.termsUrl && (
                <a href={BRANDING.legal.termsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-brand-accent-400 transition">Terms of Service</a>
              )}
              {BRANDING.legal.cancellationUrl && (
                <a href={BRANDING.legal.cancellationUrl} target="_blank" rel="noopener noreferrer" className="hover:text-brand-accent-400 transition">Cancellation Policy</a>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}