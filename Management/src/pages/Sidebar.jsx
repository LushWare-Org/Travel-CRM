import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Home, Users, MapPin, DollarSign, User, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navigationItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: Users, label: "Lead Management", path: "/leads" },
    { icon: MapPin, label: "Itineraries", path: "/itineraries" },
    { icon: DollarSign, label: "Billing", path: "/billing" },
    { icon: User, label: "User Management", path: "/users" }
  ];

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

  return (
    <div className={`${sidebarOpen ? "w-64" : "w-20"} bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 flex flex-col shadow-xl`}>
      <div className="p-6 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center font-bold text-lg flex-shrink-0">
            TA
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="text-lg font-bold">Trip Sky Way</h1>
              <p className="text-xs text-gray-400">Travel Agency Management</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
              isActive(item.path) ? "bg-slate-600 text-white" : "hover:bg-slate-700"
            }`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* User Profile Section */}
      {sidebarOpen && user && (
        <div className="p-4 border-t border-slate-700 border-b">
          <div className="bg-slate-700 rounded-lg p-3 mb-3">
            <p className="text-xs text-gray-400">Logged in as</p>
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user.role}</p>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-slate-700 space-y-2">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-gray-600 transition-colors text-white font-medium"
        >
          <LogOut className="w-5 h-5" />
          {sidebarOpen && <span className="text-sm">{isLoggingOut ? "Logging out..." : "Logout"}</span>}
        </button>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full flex items-center justify-center bg-slate-700 px-4 py-2 rounded-lg hover:bg-slate-600 transition-colors text-gray-300 hover:text-white"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;