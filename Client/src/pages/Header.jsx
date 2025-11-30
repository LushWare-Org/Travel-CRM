import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Phone, Mail, MapPin, Plane, LogOut } from 'lucide-react';
import { useLocation } from 'react-router-dom';
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
  const searchParams = new URLSearchParams(location.search);
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen]);

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
    user && { name: 'My Account', page: 'my-account' },
    !user && { name: 'Login', page: 'login' },
  ].filter(Boolean);

  const getColumnClass = len => len <= 7 ? 'grid-cols-2' : len <= 15 ? 'grid-cols-3' : 'grid-cols-4';
  const getDropdownWidth = len => len <= 7 ? 'w-80' : len <= 15 ? 'w-[500px]' : 'w-[600px]';
  const isItemActive = (item) => {
    if (item.page === 'home') return pathname === '/';
    if (pathname.startsWith(`/${item.page}`)) return true;

    if ((pathname === '/packages' || pathname.startsWith('/packages?'))) {
      const destination = searchParams.get('destination');
      if (!destination) return false;
      if (item.page === 'destinations-international' && internationalMenu.some(d => d.slug === destination)) return true;
      if (item.page === 'destinations-domestic' && domesticMenu.some(d => d.slug === destination)) return true;
    }
    return false;
  };

  return (
    <header className="relative z-50 overflow-visible transition-all duration-300 bg-black shadow-lg font-opensans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4">
        <div className="flex items-center justify-between gap-4 lg:gap-8 py-4 h-[70px]">
        <a href="/" className="flex items-center cursor-pointer">
            <img src="/logo.png" alt="TripSkyWay Logo" className="h-9 w-auto" />
          </a>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center space-x-1 flex-1 justify-center min-w-0">
            {navItems.map(item => {
              const isActive = isItemActive(item);

              return (
                <div
                  key={item.page}
                  className="relative group"
                  onMouseEnter={() => item.dropdown && setActiveDropdown(item.page)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <a
                    href="/"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(item.page, null, item.dropdown);
                      setActiveDropdown(null);
                    }}
                    className={`relative px-5 py-2.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap text-sm font-medium
                      ${isActive 
                        ? 'text-orange-400 font-semibold bg-orange-900/20' 
                        : 'text-gray-300 hover:text-orange-400 hover:bg-white/5'
                      }
                      ${item.page === 'login' ? 'border border-orange-500/50 hover:border-orange-400' : ''}
                    `}
                    onMouseEnter={(e) => {
                      if (!isActive && item.page !== 'login') {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = '';
                      }
                    }}
                  >
                    {item.name}
                    {item.dropdown && (
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${activeDropdown === item.page ? 'rotate-180' : ''}`}
                      />
                    )}
                  </a>

                  {/* Dropdown Menu */}
                  {item.dropdown && activeDropdown === item.page && (
                    <div
                      className={`absolute top-full left-1/2 -translate-x-1/2 mt-0 ${getDropdownWidth(item.dropdown.length)} bg-white rounded-xl shadow-2xl border border-gray-100 py-5 z-50 animate-fadeIn`}
                      onMouseEnter={() => setActiveDropdown(item.page)}
                      onMouseLeave={() => setActiveDropdown(null)}
                      style={{ marginTop: '-2px', paddingTop: '10px' }}
                    >
                      <div className="px-5">
                        <div className={`grid ${getColumnClass(item.dropdown.length)} gap-3`}>
                          {item.dropdown.map(sub => {
                            const qVal = sub.slug;
                            return (
                              <a
                                key={sub.id}
                                href={`/packages?destination=${qVal}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  onNavigate('packages', `destination=${qVal}`);
                                  setActiveDropdown(null);
                                }}
                                className="px-4 py-2.5 text-left text-sm text-gray-700 hover:text-orange-600 hover:bg-orange-50 transition-all rounded-lg font-medium whitespace-nowrap block"
                              >
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

          {/* Right Side */}
          <div className="hidden lg:flex items-center gap-3 ml-auto flex-shrink-0">
            <a
              href="/planner"
              className="group relative overflow-hidden bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-full font-semibold text-xs shadow-lg hover:shadow-xl transition-all duration-300 inline-flex items-center px-3 py-2"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center justify-center gap-1.5">
                <Plane className="w-3.5 h-3.5" />
                <span className="text-xs">Plan Your Trip</span>
              </div>
            </a>

            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(prev => !prev)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full border border-gray-700 bg-gray-900/80 backdrop-blur-sm hover:border-orange-500 transition-all"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-200 max-w-[100px] truncate">
                    {user.name?.split(' ')[0] || user.email || 'User'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-xs text-gray-500">Signed in as</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                        onNavigate('home');
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors flex items-center gap-3"
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
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
      `}</style>
    </header>
  );
}