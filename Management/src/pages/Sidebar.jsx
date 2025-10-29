import { useState } from "react";
import { useLocation } from "wouter";
import { Menu, X, Home, Users, MapPin, DollarSign, User, LogOut } from "lucide-react";

const Sidebar = ({ user, onLogout }) => {
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigationItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: Users, label: "Lead Management", path: "/leads" },
    { icon: MapPin, label: "Itineraries", path: "/itineraries" },
    { icon: DollarSign, label: "Billing", path: "/billing" },
    { icon: User, label: "User Management", path: "/users" }
  ];

  return (
    <div className={`${sidebarOpen ? "w-64" : "w-20"} h-full bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 flex flex-col shadow-xl`}>
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

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigationItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
              location === item.path ? "bg-slate-600 text-white" : "hover:bg-slate-700"
            }`}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* User info and logout */}
      <div className="p-4 border-t border-slate-700">
        {sidebarOpen && (
          <div className="mb-3 p-2 bg-slate-800 rounded-lg">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded">
              {user?.role}
            </span>
          </div>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-full flex items-center justify-center gap-2 bg-slate-700 px-4 py-2 rounded-lg hover:bg-slate-600 transition-colors text-gray-300 hover:text-white mb-2"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        {sidebarOpen && (
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;