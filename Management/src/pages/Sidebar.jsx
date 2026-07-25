import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Menu, X, Home, Users, MapPin, DollarSign, User, LogOut,
  BarChart3, Briefcase, ChevronRight, Sparkles, Plane, Hotel
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { usePermission } from "../contexts/PermissionContext";
import toast from "react-hot-toast";
import BRANDING, { getSidebarInfo } from "../config/branding";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const permission = usePermission();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [location.pathname, isMobile]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const navigationItems = [
    { icon: Home, label: "Dashboard", path: "/", requiredPermission: null },
    { icon: BarChart3, label: "Analytics", path: "/analytics", requiredPermission: "view_reports" },
    { icon: Users, label: "Lead Management", path: "/leads", requiredPermission: null, allowedRoles: ["salesRep"], requiresAnyPermission: ["manage_leads"] },
    {
      icon: MapPin,
      label: "Packages",
      path: "/itineraries",
      requiredPermission: null,
      customCheck: (userRole, userIsSuperAdmin, hasPermission) => {
        if (userRole === 'superAdmin' && userIsSuperAdmin === true) return true;
        if (userRole === 'salesRep') return true;
        if (userRole === 'admin') return hasPermission('manage_packages');
        return false;
      }
    },
    { icon: Plane, label: "Flights", path: "/flights", requiredPermission: null, allowedRoles: ["salesRep", "admin", "superAdmin"] },
    { icon: Hotel, label: "Hotels", path: "/hotels", requiredPermission: null, allowedRoles: ["salesRep", "admin", "superAdmin"] },
    { icon: DollarSign, label: "Billing", path: "/billing", requiredPermission: "manage_billing" },
    { icon: User, label: "User Management", path: "/users", requiredPermission: null, requiresAnyPermission: ["manage_users", "manage_sales_reps", "manage_vendors", "manage_admins"] },
    {
      icon: Briefcase,
      label: "Career",
      path: "/career",
      requiredPermission: null,
      customCheck: (userRole) => userRole === 'superAdmin'
    }
  ];

  // Filter navigation items based on permissions and roles
  const accessibleItems = navigationItems.filter((item) => {
    if (item.customCheck) {
      return item.customCheck(user?.role, user?.isSuperAdmin, (perm) => permission.hasPermission(perm));
    }
    if (item.allowedRoles && item.allowedRoles.includes(user?.role)) {
      return true;
    }
    if (!item.requiredPermission && !item.requiresAnyPermission) {
      return true;
    }
    if (item.requiredPermission) {
      return permission.hasPermission(item.requiredPermission);
    }
    if (item.requiresAnyPermission) {
      return item.requiresAnyPermission.some((perm) => permission.hasPermission(perm));
    }
    return false;
  });

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const formatGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Toggle for mobile
  const toggleMobile = useCallback(() => setMobileOpen(prev => !prev), []);

  const sidebarContent = (isExpanded) => (
    <div
      className={`${isExpanded ? "w-72" : "w-20"} h-full transition-all duration-300 flex flex-col relative overflow-hidden`}
      style={{
        background: 'linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)',
      }}
    >
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-sky-200/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
      <div className="absolute bottom-20 left-0 w-24 h-24 bg-blue-200/40 rounded-full -translate-x-1/2 blur-xl" />

      {/* Header / Brand */}
      <div className="p-5 border-b border-sky-200/60 backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-3">
          <div
            className={`${isExpanded ? 'w-12 h-12' : 'w-10 h-10'} rounded-2xl flex items-center justify-center font-bold text-white shadow-lg transition-all duration-300 flex-shrink-0`}
            style={{
              background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #0369a1 100%)',
              boxShadow: '0 8px 24px -4px rgba(14, 165, 233, 0.4)',
            }}
          >
            <span className={`${isExpanded ? 'text-lg' : 'text-sm'} font-extrabold tracking-tight`}>
              {getSidebarInfo().shortName.substring(0, 2)}
            </span>
          </div>
          {isExpanded && (
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-sky-900 truncate">{getSidebarInfo().name}</h1>
              <p className="text-xs text-sky-600 font-medium truncate">{getSidebarInfo().tagline}</p>
            </div>
          )}
          {/* Close button on mobile */}
          {isMobile && isExpanded && (
            <button onClick={() => setMobileOpen(false)} className="p-2 rounded-xl hover:bg-sky-100 text-sky-600 ml-auto">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto relative z-10">
        <div className={`${isExpanded ? 'px-3' : 'px-1'} mb-4`}>
          {isExpanded && (
            <p className="text-[10px] uppercase tracking-wider text-sky-500 font-semibold">Main Menu</p>
          )}
        </div>

        {accessibleItems.map((item, index) => {
          const active = isActive(item.path);
          const hovered = hoveredItem === index;

          return (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
                else setSidebarOpen(false);
              }}
              onMouseEnter={() => setHoveredItem(index)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left group relative overflow-hidden ${active
                ? 'text-white shadow-lg'
                : 'text-sky-700 hover:bg-white/60'
                }`}
              style={active ? {
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                boxShadow: '0 4px 12px -2px rgba(14, 165, 233, 0.35)',
              } : {}}
            >
              {/* Active indicator bar */}
              {active && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-white/40"
                />
              )}

              <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${hovered && !active ? 'scale-110' : ''
                } ${active ? 'text-white' : 'text-sky-500'}`} />

              {isExpanded && (
                <>
                  <span className={`text-sm font-medium flex-1 ${active ? 'text-white' : ''}`}>
                    {item.label}
                  </span>
                  <ChevronRight className={`w-4 h-4 transition-all duration-200 ${active ? 'text-white/70 opacity-100' : 'text-sky-400 opacity-0 group-hover:opacity-100'
                    } ${hovered ? 'translate-x-1' : ''}`} />
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile Section */}
      {isExpanded && user && (
        <div className="p-4 border-t border-sky-200/60 relative z-10">
          <div
            className="rounded-2xl p-4 backdrop-blur-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(240,249,255,0.9) 100%)',
              border: '1px solid rgba(14, 165, 233, 0.15)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold shadow-md flex-shrink-0"
                style={{
                  background: user.role === 'superAdmin'
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                }}
              >
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-sky-500 font-medium">{formatGreeting()}</p>
                <p className="text-sm font-semibold text-sky-900 truncate">{user.name}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${user.role === 'superAdmin'
                  ? 'bg-amber-100 text-amber-700'
                  : user.role === 'admin'
                    ? 'bg-sky-100 text-sky-700'
                    : 'bg-emerald-100 text-emerald-700'
                  }`}
              >
                {user.role === 'superAdmin' ? '⭐ Super Admin' : user.role === 'admin' ? 'Admin' : 'Sales Rep'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-4 space-y-2 relative z-10">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isLoggingOut
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-red-50 text-red-600 hover:bg-red-100 hover:shadow-md'
            }`}
          style={{
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          <LogOut className="w-5 h-5" />
          {isExpanded && (
            <span className="text-sm">{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
          )}
        </button>

        {!isMobile && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-2 bg-white/70 backdrop-blur-sm px-4 py-2.5 rounded-xl hover:bg-white transition-all duration-200 text-sky-600 hover:text-sky-700 border border-sky-100"
          >
            {sidebarOpen ? (
              <>
                <X className="w-4 h-4" />
                <span className="text-xs font-medium">Collapse</span>
              </>
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
    </div>
  );

  // Mobile: render hamburger button + overlay drawer
  if (isMobile) {
    return (
      <>
        {/* Mobile Hamburger Button - Fixed top-left */}
        {!mobileOpen && (
          <button
            onClick={toggleMobile}
            className="fixed top-3 left-3 z-50 p-2.5 rounded-xl bg-white shadow-lg border border-sky-100 text-sky-600 hover:bg-sky-50 transition-all"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar Drawer */}
        <div
          className={`fixed top-0 left-0 h-full z-50 transform transition-transform duration-300 ease-in-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent(true)}
        </div>
      </>
    );
  }

  // Desktop: render inline sidebar
  return sidebarContent(sidebarOpen);
};

export default Sidebar;