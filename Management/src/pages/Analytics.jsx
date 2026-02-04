import { useState } from "react";
import {
  LeadAnalytics,
  BillingAnalytics,
  UserAnalytics,
  PackageAnalytics,
  WebsiteAnalytics,
} from "../features/analytics/components";
import {
  Users, DollarSign, Globe, BarChart3, Briefcase,
  TrendingUp, ChevronDown, Layers, ArrowRight
} from "lucide-react";

/**
 * Analytics Main Page - Completely Redesigned
 * Vertical sidebar navigation with main content area
 */
const Analytics = () => {
  const [activeTab, setActiveTab] = useState("leads");

  const tabs = [
    {
      id: "leads",
      label: "Lead Analytics",
      icon: TrendingUp,
      component: LeadAnalytics,
      color: "#3b82f6",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    },
    {
      id: "billing",
      label: "Billing Analytics",
      icon: DollarSign,
      component: BillingAnalytics,
      color: "#10b981",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200"
    },
    {
      id: "users",
      label: "User Analytics",
      icon: Users,
      component: UserAnalytics,
      color: "#8b5cf6",
      bgColor: "bg-violet-50",
      borderColor: "border-violet-200"
    },
    {
      id: "itineraries",
      label: "Package Analytics",
      icon: Briefcase,
      component: PackageAnalytics,
      color: "#f59e0b",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200"
    },
    {
      id: "website",
      label: "Website Analytics",
      icon: Globe,
      component: WebsiteAnalytics,
      color: "#06b6d4",
      bgColor: "bg-cyan-50",
      borderColor: "border-cyan-200"
    },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);
  const ActiveComponent = activeTabData?.component;

  return (
    <div className="h-full flex bg-slate-50">
      {/* Left Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg">Analytics</h1>
              <p className="text-xs text-slate-400">Business Insights</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold px-3 mb-3">Reports</p>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${isActive
                    ? `${tab.bgColor} ${tab.borderColor} border`
                    : 'hover:bg-slate-50 border border-transparent'
                  }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${isActive ? 'shadow-md' : 'bg-slate-100 group-hover:bg-slate-200'
                    }`}
                  style={isActive ? { backgroundColor: tab.color } : {}}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                </div>
                <span className={`text-sm font-medium flex-1 text-left ${isActive ? 'text-slate-800' : 'text-slate-600'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="p-4 border-t border-slate-100">
          <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-600">Quick Tip</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Use time filters in each report to analyze specific periods.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar with Active Tab Info */}
        <div className="bg-white border-b border-slate-200 px-8 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {activeTabData && (
                <>
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: activeTabData.color }}
                  >
                    <activeTabData.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{activeTabData.label}</h2>
                    <p className="text-sm text-slate-500">Detailed analytics and performance metrics</p>
                  </div>
                </>
              )}
            </div>

            {/* Optional: Quick navigation dropdown for mobile */}
            <div className="lg:hidden">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-700"
              >
                {tabs.map(tab => (
                  <option key={tab.id} value={tab.id}>{tab.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 lg:p-8">
                {ActiveComponent && <ActiveComponent />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
