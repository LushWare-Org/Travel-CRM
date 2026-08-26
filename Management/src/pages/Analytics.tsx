import { useState, type ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  LeadAnalytics,
  BillingAnalytics,
  UserAnalytics,
  PackageAnalytics,
  WebsiteAnalytics,
  MyPerformanceAnalytics,
} from '../features/analytics/components';
import {
  Users, DollarSign, Globe, BarChart3, Briefcase,
  TrendingUp, ArrowRight, Layers, Zap
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Package, Website, and User analytics are admin-only on the backend
// (company-wide data with no per-rep ownership) — hide them from salesRep
// instead of showing a tab that 403s.
const ADMIN_ONLY_TAB_IDS = ['itineraries', 'website', 'users'];

// "My Performance" is scoped to req.user.id server-side — meaningless for an
// admin account (which already has the org-wide salesrep-comparison view), so
// keep it salesRep-only rather than showing it to everyone.
const SALESREP_ONLY_TAB_IDS = ['my-performance'];

interface AnalyticsTab {
  id: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  component: ComponentType;
}

/**
 * Analytics Main Page - Responsive Design
 * Desktop: Vertical sidebar navigation with main content area
 * Mobile: Horizontal scrollable tabs with full-width content
 */
const Analytics = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('leads');

  const allTabs: AnalyticsTab[] = [
    { id: 'leads', label: 'Lead Analytics', shortLabel: 'Leads', icon: TrendingUp, component: LeadAnalytics },
    { id: 'billing', label: 'Billing Analytics', shortLabel: 'Billing', icon: DollarSign, component: BillingAnalytics },
    { id: 'users', label: 'User Analytics', shortLabel: 'Users', icon: Users, component: UserAnalytics },
    { id: 'itineraries', label: 'Package Analytics', shortLabel: 'Packages', icon: Briefcase, component: PackageAnalytics },
    { id: 'website', label: 'Website Analytics', shortLabel: 'Website', icon: Globe, component: WebsiteAnalytics },
    { id: 'my-performance', label: 'My Performance', shortLabel: 'My Stats', icon: Zap, component: MyPerformanceAnalytics },
  ];

  const tabs = allTabs.filter((tab) => {
    if (user?.role === 'salesRep') return !ADMIN_ONLY_TAB_IDS.includes(tab.id);
    return !SALESREP_ONLY_TAB_IDS.includes(tab.id);
  });

  const activeTabData = tabs.find(t => t.id === activeTab) || tabs[0];
  const ActiveComponent = activeTabData?.component;

  return (
    <div className="h-full flex flex-col md:flex-row bg-background">
      {/* Mobile Header + Horizontal Tabs */}
      <div className="md:hidden bg-card border-b border-border sticky top-0 z-10">
        {/* Mobile Header */}
        <div className="px-4 pt-3 pb-2 flex items-center gap-3 pl-14">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary-foreground" />
          </div>
          <h1 className="font-heading font-bold text-foreground text-lg">Analytics</h1>
        </div>

        {/* Horizontal scrollable tabs */}
        <div className="flex overflow-x-auto px-3 pb-3 gap-2 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Left Sidebar Navigation */}
      <div className="hidden md:flex w-64 bg-card border-r border-border flex-shrink-0 flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-primary flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-foreground text-lg">Analytics</h1>
              <p className="text-xs text-muted-foreground">Business Insights</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold px-3 mb-3">Reports</p>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-150 group ${isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-foreground'
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-primary-foreground/15' : 'bg-muted group-hover:bg-accent'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                </div>
                <span className={`text-sm font-medium flex-1 text-left ${isActive ? 'text-primary-foreground' : 'text-foreground'}`}>
                  {tab.label}
                </span>
                {isActive && (
                  <ArrowRight className="w-4 h-4 text-primary-foreground/70" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="p-4 border-t border-border">
          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">Quick Tip</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Use time filters in each report to analyze specific periods.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Desktop Top Bar with Active Tab Info */}
        <div className="hidden md:block bg-card border-b border-border px-8 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {activeTabData && (
                <>
                  <div className="w-11 h-11 rounded-lg bg-primary flex items-center justify-center">
                    <activeTabData.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="font-heading text-xl font-bold text-foreground">{activeTabData.label}</h2>
                    <p className="text-sm text-muted-foreground">Detailed analytics and performance metrics</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
              <div className="p-4 sm:p-6 lg:p-8">
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
