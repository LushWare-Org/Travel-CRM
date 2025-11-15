import { useState } from "react";
import {
  LeadAnalytics,
  BillingAnalytics,
  UserAnalytics,
  ItineraryAnalytics,
  WebsiteAnalytics,
} from "../features/analytics/components";

/**
 * Analytics Main Page
 * Tabbed interface for different analytics sections
 */
const Analytics = () => {
  const [activeTab, setActiveTab] = useState("leads");

  const tabs = [
    { id: "leads", label: "Lead Analytics", component: LeadAnalytics },
    { id: "billing", label: "Billing Analytics", component: BillingAnalytics },
    { id: "users", label: "User Analytics", component: UserAnalytics },
    { id: "itineraries", label: "Package Analytics", component: ItineraryAnalytics },
    { id: "website", label: "Website Analytics", component: WebsiteAnalytics },
  ];

  return (
    <div className="h-full overflow-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm sticky top-0 z-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-gray-600 mt-1">Comprehensive business analytics and insights</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-gray-200 px-8 sticky top-20 z-10">
        <div className="flex gap-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
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

export default Analytics;
