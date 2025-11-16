import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LeadAnalytics,
  BillingAnalytics,
  UserAnalytics,
  PackageAnalytics,
  WebsiteAnalytics,
} from "./components";

/**
 * Main Analytics Page Component
 * Tabbed interface to switch between different analytics sections
 */
const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState("leads");

  const tabs = [
    { id: "leads", label: "Lead Analytics", component: LeadAnalytics },
    { id: "billing", label: "Billing Analytics", component: BillingAnalytics },
    { id: "users", label: "User Analytics", component: UserAnalytics },
    { id: "itineraries", label: "Package Analytics", component: PackageAnalytics },
    { id: "website", label: "Website Analytics", component: WebsiteAnalytics },
  ];

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-600 mt-1">Comprehensive business analytics and insights</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-gray-200 px-8">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 border-b-2 font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {tabs.map((tab) => (
          <div key={tab.id} style={{ display: activeTab === tab.id ? "block" : "none" }}>
            <tab.component />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalyticsPage;
