import { useState, useEffect } from 'react';
import { Menu, X, ChevronDown, Phone, Mail, MapPin, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { headerInternational, headerDomestic } from '../data/mockData';

export default function Header({ currentPage, onNavigate }) {
  const [scrollY, setScrollY] = useState(0);
  const isScrolled = scrollY > 50;
  const [activeDropdown, setActiveDropdown] = useState(null);
  const location = useLocation();
  const pathname = location.pathname;

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Home', page: 'home' },
    { name: 'International Destinations', page: 'destinations-international', dropdown: headerInternational },
    { name: 'Domestic Destinations', page: 'destinations-domestic', dropdown: headerDomestic },
    { name: 'About Us', page: 'about' },
    { name: 'Contact', page: 'contact' },
    { name: 'Login', page: 'login' },
  ];

  const getColumnClass = len => len <= 7 ? 'grid-cols-2' : len <= 15 ? 'grid-cols-3' : 'grid-cols-4';
  const getDropdownWidth = len => len <= 7 ? 'w-80' : len <= 15 ? 'w-[500px]' : 'w-[650px]';

  return (
    <header className={`relative z-50 overflow-visible transition-all duration-300 bg-white shadow-lg font-opensans`}>
      <div className={`absolute top-0 left-0 w-full bg-black text-white py-1 px-4 hidden md:block transition-all duration-300 overflow-hidden ${isScrolled ? 'max-h-0 opacity-0' : 'max-h-12 opacity-100'}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center text-sm">
          <div className="flex items-center gap-6">
            <a href="tel:+919876543210" className="flex items-center gap-2 hover:text-yellow-200 transition"><Phone size={14} /><span>+91 98765 43210</span></a>
            <a href="mailto:info@travelagency.com" className="flex items-center gap-2 hover:text-yellow-200 transition"><Mail size={14} /><span>info@travelagency.com</span></a>
          </div>
          <div className="flex items-center gap-2"><MapPin size={14} /><span>2/73, near Gurudwara, Lalita Park, Laxmi Nagar, New Delhi</span></div>
        </div>
      </div>

      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-5 ${isScrolled ? 'pt-0' : 'pt-6'}`}>
        <div className="flex items-center justify-between h-20">
          <a href="/" className="flex items-center cursor-pointer">
            <div className="ml-3"><h1 className="text-lg font-bold text-gray-900 font-poppins">TripSkyWay</h1></div>
          </a>

          <nav className="hidden lg:flex items-center space-x-6 overflow-visible font-opensans">
            {navItems.map(item => {
              const path = item.page === 'home' ? '/' : `/${item.page}`;
              const isActive = item.page === 'home' ? pathname === '/' : pathname.startsWith(`/${item.page}`);
              return (
                <div key={item.page} className="relative group"
                     onMouseEnter={() => item.dropdown && setActiveDropdown(item.page)}
                     onMouseLeave={() => setActiveDropdown(null)}>
                  <a href={path} onClick={e => { e.preventDefault(); onNavigate(item.page, null, item.dropdown); setActiveDropdown(null); }}
                     className={`px-2 py-1.5 rounded-lg flex items-center gap-1 transition-all whitespace-nowrap ${isActive ? 'bg-gradient-to-r from-orange-600 to-yellow-600 text-white shadow-md' : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'} ${item.page === 'login' ? 'border border-gray-200 text-gray-700' : ''}`}>
                    {item.name}{item.dropdown && <ChevronDown size={16} />}
                  </a>

                  {item.dropdown && activeDropdown === item.page && (
                    <div className={`absolute top-full left-0 mt-0 ${getDropdownWidth(item.dropdown.length)} bg-white rounded-lg shadow-xl border border-gray-100 py-4 animate-fadeIn z-50`}
                         onMouseEnter={() => setActiveDropdown(item.page)} onMouseLeave={() => setActiveDropdown(null)}>
                      <div className="px-3">
                        <div className={`grid ${getColumnClass(item.dropdown.length)} gap-1`}>
                          {item.dropdown.map(sub => {
                            const qKey = item.page.includes('domestic') ? 'state' : 'country';
                            const qVal = sub.slug;
                            const url = `/packages?${qKey}=${qVal}`;
                            return (
                              <a key={sub.id} href={url} onClick={e => { e.preventDefault(); onNavigate('packages', `${qKey}=${qVal}`); setActiveDropdown(null); }}
                                 className="px-3 py-2 text-left text-sm text-gray-700 hover:text-orange-600 hover:bg-orange-50 transition-colors block rounded-md whitespace-nowrap">
                                {sub.name}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-6">
            <a href="/planner" className="px-3 py-2 bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-orange-500 transition-all shadow-md hover:shadow-lg font-semibold">
              Plan Your Trip
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}