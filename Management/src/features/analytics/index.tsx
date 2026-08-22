import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  LeadAnalytics,
  BillingAnalytics,
  UserAnalytics,
  PackageAnalytics,
  WebsiteAnalytics,
} from './components';

/**
 * Main Analytics Page Component
 * Tabbed interface to switch between different analytics sections
 */
const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState('leads');

  const tabs = [
    { id: 'leads', label: 'Lead Analytics', component: LeadAnalytics },
    { id: 'billing', label: 'Billing Analytics', component: BillingAnalytics },
    { id: 'users', label: 'User Analytics', component: UserAnalytics },
    { id: 'itineraries', label: 'Package Analytics', component: PackageAnalytics },
    { id: 'website', label: 'Website Analytics', component: WebsiteAnalytics },
  ];

  return (
    <div className="h-full overflow-auto bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 sm:px-8 py-6 shadow-card">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">Analytics & Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm">Comprehensive business analytics and insights</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => value && setActiveTab(String(value))}>
        {/* Tabs Navigation */}
        <div className="bg-card border-b border-border px-4 sm:px-8">
          <TabsList variant="line" className="overflow-x-auto">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="whitespace-nowrap px-3 py-3">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-8">
          {tabs.map((tab) => (
            // keepMounted preserves the previous behavior (a plain display:none
            // toggle) of keeping every tab's data fetched and its state alive
            // across switches, rather than Base UI's default of unmounting -
            // and refetching - an inactive tab's panel.
            <TabsContent key={tab.id} value={tab.id} keepMounted>
              <tab.component />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
};

export default AnalyticsPage;
