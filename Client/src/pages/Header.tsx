import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { fetchPackages } from '../services/api/packages';
import { useAuth } from '../contexts/AuthContext';
import LazyIcon from '../components/shared/LazyIcon';
import { ChevronDown } from 'lucide-react';
import BRANDING from '../config/branding';
import { PAGE_CONFIG } from '../config/pages';

const MAX_NAV_ITEMS = 12;

interface DestinationMenuItem {
  id: string;
  name: string;
  slug: string;
}

interface NavItem {
  name: string;
  page: string;
  dropdown?: DestinationMenuItem[];
}

export interface HeaderProps {
  currentPage?: string;
  onNavigate: (page: string, filter?: string | null, force?: unknown) => void;
}

export default function Header({ onNavigate }: HeaderProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState<string | null>(null);
  const [internationalMenu, setInternationalMenu] = useState<DestinationMenuItem[]>([]);
  const location = useLocation();
  const pathname = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const sideMenuRef = useRef<HTMLDivElement>(null);
  const [destinationsLoaded, setDestinationsLoaded] = useState(false);
  const destinationsLoadRef = useRef<Promise<void> | null>(null);
  const dropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    let inactivityTimer: ReturnType<typeof setTimeout>;
    const INACTIVITY_TIMEOUT = 15 * 60 * 1000;
    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        logout();
        onNavigate('home');
      }, INACTIVITY_TIMEOUT);
    };
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    activityEvents.forEach((event) => {
      window.addEventListener(event, resetInactivityTimer);
    });
    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimer);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [user, logout, onNavigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sideMenuRef.current && !sideMenuRef.current.contains(event.target as Node)) {
        setSideMenuOpen(false);
      }
    };

    if (sideMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [sideMenuOpen]);

  const loadDestinationsOnDemand = useCallback(() => {
    if (!PAGE_CONFIG.destinations.enabled) return;
    if (destinationsLoadRef.current || destinationsLoaded) return;
    destinationsLoadRef.current = fetchPackages({ limit: 100 })
      .then(({ destinations }) => {
        const sorted = (destinations || []).slice().sort((a, b) => (b.packagesCount || 0) - (a.packagesCount || 0));
        setInternationalMenu(
          sorted.slice(0, MAX_NAV_ITEMS).map((dest) => ({ id: dest.id, name: dest.name, slug: dest.slug })),
        );
        setDestinationsLoaded(true);
      })
      .catch(() => {
        setInternationalMenu([]);
        setDestinationsLoaded(true);
      })
      .finally(() => {
        destinationsLoadRef.current = null;
      });
  }, [destinationsLoaded]);
  useEffect(() => {
    loadDestinationsOnDemand();
  }, [loadDestinationsOnDemand]);

  const navItems = useMemo<NavItem[]>(
    () =>
      (
        [
          { name: 'Home', page: 'home' },
          PAGE_CONFIG.destinations.enabled && { name: 'Destinations', page: 'destinations-international', dropdown: internationalMenu },
          PAGE_CONFIG.about.enabled && { name: 'About Us', page: 'about' },
          { name: 'Contact', page: 'contact' },
          PAGE_CONFIG.career.enabled && { name: 'Career', page: 'career' },
          PAGE_CONFIG.account.enabled && user && { name: 'My Account', page: 'my-account' },
          PAGE_CONFIG.account.enabled && !user && { name: 'Login', page: 'login' },
        ] as Array<NavItem | false>
      ).filter((item): item is NavItem => Boolean(item)),
    [user, internationalMenu],
  );

  const leftNavItems = useMemo<NavItem[]>(
    () => (PAGE_CONFIG.destinations.enabled ? [{ name: 'Destinations', page: 'destinations-international', dropdown: internationalMenu }] : []),
    [internationalMenu],
  );

  const sideMenuItems = useMemo<NavItem[]>(
    () =>
      (
        [
          { name: 'Home', page: 'home' },
          PAGE_CONFIG.about.enabled && { name: 'About Us', page: 'about' },
          { name: 'Contact', page: 'contact' },
          PAGE_CONFIG.career.enabled && { name: 'Career', page: 'career' },
          PAGE_CONFIG.account.enabled && user && { name: 'My Account', page: 'my-account' },
          PAGE_CONFIG.account.enabled && !user && { name: 'Login', page: 'login' },
        ] as Array<NavItem | false>
      ).filter((item): item is NavItem => Boolean(item)),
    [user],
  );

  const isItemActive = useCallback(
    (item: NavItem) => {
      if (item.page === 'home') return pathname === '/';
      if (pathname.startsWith(`/${item.page}`)) return true;

      if (pathname === '/packages' || pathname.startsWith('/packages?')) {
        const destination = searchParams.get('destination');
        if (!destination) return false;
        if (item.page === 'destinations-international' && internationalMenu.some((d) => d.slug === destination)) return true;
      }
      return false;
    },
    [pathname, searchParams, internationalMenu],
  );

  return (
    <>
      <header className="relative z-header overflow-visible transition-all duration-300 shadow-lg font-body bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-4">
        <div className="flex items-center justify-between gap-4 lg:gap-8 py-4 h-[70px]">
          <a href="/" className="flex items-center cursor-pointer flex-shrink-0">
            <img src={BRANDING.company.logoPath} alt={`${BRANDING.company.name} Logo`} className="h-10 w-auto" />
          </a>
          <div className="flex-1" />
          <nav className="hidden lg:flex items-center space-x-1 flex-shrink-0">
            {leftNavItems.map((item) => {
              const isActive = isItemActive(item);

              return (
                <div
                  key={item.page}
                  className="relative"
                  onMouseEnter={() => {
                    clearTimeout(dropdownTimeoutRef.current ?? undefined);
                    setActiveDropdown(item.page);
                  }}
                  onMouseLeave={() => {
                    dropdownTimeoutRef.current = setTimeout(() => {
                      setActiveDropdown(null);
                    }, 80);
                  }}
                >
                  <a
                    href="/"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate(item.page, null, item.dropdown);
                      setActiveDropdown(null);
                    }}
                    className={`relative px-5 py-2.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap text-sm font-medium
                      ${isActive ? 'text-brand-400 font-semibold bg-brand-900/20' : 'text-gray-300 hover:text-brand-400 hover:bg-white/5'}
                      ${item.page === 'login' ? 'border border-brand-500/50 hover:border-brand-400' : ''}
                    `}
                  >
                    {item.name}
                    {item.dropdown && (
                      <LazyIcon
                        name="ChevronDown"
                        size={16}
                        className={`transition-transform duration-200 ${activeDropdown === item.page ? 'rotate-180' : ''}`}
                      />
                    )}
                  </a>

                  {/* Dropdown Menu */}
                  {item.dropdown && activeDropdown === item.page && (
                    <div
                      className="absolute top-full left-0 pt-0 z-dropdown"
                      onMouseEnter={() => {
                        clearTimeout(dropdownTimeoutRef.current ?? undefined);
                      }}
                      onMouseLeave={() => {
                        dropdownTimeoutRef.current = setTimeout(() => setActiveDropdown(null), 80);
                      }}
                    >
                      <div className="bg-white border border-gray-200 rounded-xl shadow-xl min-w-[240px] max-w-[340px] overflow-hidden mt-1">
                        <div className="py-2 max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500/60 scrollbar-track-gray-100">
                          {item.dropdown.map((sub, idx) => (
                            <a
                              key={sub.id}
                              href={`/packages?destination=${sub.slug}`}
                              onClick={(e) => {
                                e.preventDefault();
                                onNavigate('packages', `destination=${sub.slug}`);
                                setActiveDropdown(null);
                              }}
                              className="group flex items-center gap-3 px-4 py-2.5 text-gray-800 hover:text-brand-600 hover:bg-brand-50 transition-colors rounded-lg mx-1.5"
                              style={{
                                animation: `fadeInRight 0.35s ease-out ${idx * 0.035}s both`,
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-400/60 group-hover:bg-brand-500 transition-colors flex-shrink-0" />
                              <span className="text-sm font-medium truncate">{sub.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Right Side */}
            {PAGE_CONFIG.planner.enabled && (
              <a
                href="/planner"
                className="group relative overflow-hidden bg-gradient-to-r from-brand-500 to-brand-accent-500 text-white rounded-full font-semibold text-xs shadow-lg hover:shadow-xl transition-all duration-300 inline-flex items-center px-3 py-2 ml-4 flex-shrink-0"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-brand-accent-500 to-brand-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center justify-center gap-1.5">
                  <LazyIcon name="Plane" size={14} className="w-3.5 h-3.5" />
                  <span className="text-xs">Plan Your Trip</span>
                </div>
              </a>
            )}
          </nav>

          <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full border border-gray-700 bg-gray-900/80 backdrop-blur-sm hover:border-brand-500 transition-all"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-accent-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-200 max-w-[100px] truncate">
                    {user.name?.split(' ')[0] || user.email || 'User'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 z-dropdown">
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
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-600 transition-colors flex items-center gap-3"
                    >
                      <LazyIcon name="LogOut" size={16} className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Side Menu Button */}
            <button
              onClick={() => setSideMenuOpen(!sideMenuOpen)}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-900/80 border border-gray-700 text-white hover:border-brand-500 transition-all flex-shrink-0"
              aria-label="Toggle side menu"
            >
              {sideMenuOpen ? <LazyIcon name="X" size={20} className="w-5 h-5" /> : <LazyIcon name="Menu" size={20} className="w-5 h-5" />}
            </button>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-gray-900/80 border border-gray-700 text-white hover:border-brand-500 transition-all"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <LazyIcon name="X" size={20} className="w-5 h-5" /> : <LazyIcon name="Menu" size={20} className="w-5 h-5" />}
          </button>
        </div>
      </div>
      </header>

      {/* Mobile menu, backdrop, and side menu — portaled to document.body so
          they escape the header's own stacking context (z-header) and
          always render above siblings like FloatingActionStack, regardless
          of their z-index. */}
      {createPortal(
        <>
        {/* Mobile Menu */}
        <div
          className={`fixed lg:hidden top-0 right-0 h-screen w-3/4 bg-gray-950 border-l border-gray-800 shadow-2xl z-modal transform transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">Menu</h2>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-gray-800 rounded-lg transition-all">
              <LazyIcon name="X" size={20} className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="p-4 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 70px)' }}>
            {navItems.map((item) => {
              const isActive = isItemActive(item);
              const isMobileDropdownOpen = mobileDropdownOpen === item.page;
              return (
                <div key={item.page}>
                  <div className="flex items-center">
                    <button
                      onClick={() => {
                        onNavigate(item.page, null, null);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex-1 text-left px-4 py-3 rounded-lg transition-all text-sm font-medium
                        ${isActive ? 'text-brand-400 bg-brand-900/20' : 'text-gray-300 hover:text-brand-400 hover:bg-white/5'}
                      `}
                    >
                      {item.name}
                    </button>
                    {item.dropdown && (
                      <button
                        onClick={() => setMobileDropdownOpen(isMobileDropdownOpen ? null : item.page)}
                        className="px-3 py-3 text-gray-300 hover:text-brand-400 transition-all"
                      >
                        <LazyIcon name="ChevronDown" size={16} className={`transition-transform ${isMobileDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>

                  {/* Mobile Dropdown List */}
                  {item.dropdown && isMobileDropdownOpen && (
                    <div className="bg-gray-900/50 rounded-lg mt-1 mb-2 grid grid-cols-2 gap-2 p-3">
                      {item.dropdown.map((dest) => (
                        <button
                          key={dest.id}
                          onClick={() => {
                            onNavigate('packages', `destination=${dest.slug}`);
                            setMobileMenuOpen(false);
                            setMobileDropdownOpen(null);
                          }}
                          className="text-left px-3 py-2 text-xs rounded-lg bg-gray-800/50 text-gray-300 hover:text-brand-400 hover:bg-brand-900/20 transition-all"
                        >
                          {dest.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {PAGE_CONFIG.planner.enabled && (
              <div className="border-t border-gray-800 mt-4 pt-4">
                <a
                  href="/planner"
                  onClick={() => {
                    onNavigate('planner');
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-center py-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-accent-500 text-white font-semibold text-sm hover:shadow-lg transition-all"
                >
                  Plan Your Trip
                </a>
              </div>
            )}
            {user && (
              <div className="border-t border-gray-800 mt-4 pt-4">
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                    onNavigate('home');
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-brand-400 hover:bg-white/5 rounded-lg transition-all flex items-center gap-3"
                >
                  <LazyIcon name="LogOut" size={16} className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </nav>
        </div>

        {mobileMenuOpen && <div className="fixed inset-0 lg:hidden bg-black/40 z-overlay" onClick={() => setMobileMenuOpen(false)} />}

        {/* Side Menu */}
        <div
          ref={sideMenuRef}
          className={`fixed top-0 right-0 h-screen w-80 bg-gray-950 border-l border-gray-800 shadow-2xl z-modal transform transition-transform duration-300 ${sideMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h2 className="text-lg font-bold text-white">Menu</h2>
            <button onClick={() => setSideMenuOpen(false)} className="p-2 hover:bg-gray-800 rounded-lg transition-all">
              <LazyIcon name="X" size={20} className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="p-4 space-y-2">
            {sideMenuItems.map((item) => {
              const isActive = isItemActive(item);
              return (
                <button
                  key={item.page}
                  onClick={() => {
                    onNavigate(item.page, null, item.dropdown);
                    setSideMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all text-sm font-medium
                    ${isActive ? 'text-brand-400 bg-brand-900/20' : 'text-gray-300 hover:text-brand-400 hover:bg-white/5'}
                  `}
                >
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>
        </>,
        document.body,
      )}
    </>
  );
}
