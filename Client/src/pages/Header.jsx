import { useState, useEffect } from 'react';
import { Menu, X, ChevronDown, Phone, Mail, MapPin, Search, Plane, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { fetchPackages } from '../utils/packageApi';
import { useAuth } from '../context/AuthContext';

const MAX_NAV_ITEMS = 12;

export default function Header({ currentPage, onNavigate }) {
  const [scrollY, setScrollY] = useState(0);
  const isScrolled = scrollY > 50;
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [internationalMenu, setInternationalMenu] = useState([]);
  const [domesticMenu, setDomesticMenu] = useState([]);
  const location = useLocation();
  const pathname = location.pathname;
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchPackages({ limit: 100 })
      .then(({ destinations }) => {
        if (!isMounted) return;
        const sorted = destinations.slice().sort((a, b) => (b.packagesCount || 0) - (a.packagesCount || 0));
        setInternationalMenu(
          sorted
            .filter((dest) => dest.type !== 'domestic')
            .slice(0, MAX_NAV_ITEMS)
            .map((dest) => ({ id: dest.id, name: dest.name, slug: dest.slug }))
        );
        setDomesticMenu(
          sorted
            .filter((dest) => dest.type === 'domestic')
            .slice(0, MAX_NAV_ITEMS)
            .map((dest) => ({ id: dest.id, name: dest.name, slug: dest.slug }))
        );
      })
      .catch(() => {
        if (!isMounted) return;
        setInternationalMenu([]);
        setDomesticMenu([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const navItems = [
    { name: 'Home', page: 'home' },
    { name: 'International Destinations', page: 'destinations-international', dropdown: internationalMenu },
    { name: 'Domestic Destinations', page: 'destinations-domestic', dropdown: domesticMenu },
    { name: 'About Us', page: 'about' },
    { name: 'Contact', page: 'contact' },
    !user && { name: 'Login', page: 'login' },
  ].filter(Boolean);

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
        <div className="flex flex-wrap items-center justify-between gap-4 lg:gap-8 py-3">
          <a href="/" className="flex items-center cursor-pointer">
            <div className="ml-3"><h1 className="text-lg font-bold text-gray-900 font-poppins">TripSkyWay</h1></div>
          </a>

          <nav className="hidden lg:flex items-center space-x-6 font-opensans flex-1 justify-center min-w-0">
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
                            const qVal = sub.slug;
                            const url = `/packages?destination=${qVal}`;
                            return (
                              <a key={sub.id} href={url} onClick={e => { e.preventDefault(); onNavigate('packages', `destination=${qVal}`); setActiveDropdown(null); }}
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

          <div className="hidden lg:flex items-center gap-3 lg:gap-4 relative ml-auto">
            <a
              href="/planner"
              className="group relative overflow-hidden bg-gradient-to-r from-orange-600 to-yellow-500 text-white rounded-full font-semibold text-xs shadow-lg hover:shadow-xl transition-all duration-300 inline-flex items-center"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative px-3 py-1.5 flex items-center justify-center space-x-1.5">
                <Plane className="w-3.5 h-3.5" />
                <span>Plan Your Trip</span>
              </div>
            </a>
            {user && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-orange-400 transition-all max-w-[180px]"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white font-semibold text-sm">
                    {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-gray-800 max-w-[90px] truncate">
                    {(user.name || '').split(' ')[0] || user.email || 'User'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-xs text-gray-400 mb-1">Signed in</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {user.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                        onNavigate('home', null, true);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}