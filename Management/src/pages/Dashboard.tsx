/**
 * Dashboard Page
 * 
 * Entry point for the dashboard. Uses the DashboardContainer component
 * which handles API data fetching and role-based content adaptation.
 * 
 * This page component has been simplified to use the feature-based architecture.
 * All functionality is organized in: src/features/dashboard/
 */

import { DashboardContainer } from '../features/dashboard';
import PageCopilot from '../features/copilot/PageCopilot';

const Dashboard = () => {
  return (
    <PageCopilot pageKey="overview" scopeLabel="Overview">
      <DashboardContainer />
    </PageCopilot>
  );
};

export default Dashboard;