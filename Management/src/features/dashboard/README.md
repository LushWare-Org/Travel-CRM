# Role-Adaptive Dashboard Implementation Guide

## Overview

The dashboard has been refactored into a **role-aware, permission-based system** that provides a unified platform overview for all authenticated users (SuperAdmin, Admin, SalesRep) while adapting content visibility based on user permissions and role.

## Architecture

### Component Structure

```
src/features/dashboard/
├── DashboardContainer.jsx               ← Smart wrapper (data fetching + permission logic)
├── sections/
│   ├── PlatformHealthCard.jsx           ← Stat cards (all roles)
│   ├── LeadFunnelSection.jsx            ← Lead trends (all roles)
│   ├── PackageDistributionSection.jsx   ← Package breakdown (all roles)
│   ├── RevenuePerformanceSection.jsx    ← Revenue & billing (admins with manage_billing)
│   ├── UserAnalyticsSection.jsx         ← User metrics (admins only, not salesReps)
│   ├── SalesRepPerformanceCard.jsx      ← Personal KPIs (salesReps only)
│   └── index.js
├── components/
│   ├── LoadingSpinner.jsx
│   └── index.js
├── index.js
└── README.md (this file)
```

## How It Works

### 1. Data Fetching (DashboardContainer)

The `DashboardContainer` is the smart wrapper that:

- **Checks user permissions** using `usePermission()` hook
- **Determines what data to fetch** based on role and permissions
- **Makes parallel API calls** to analytics endpoints
- **Handles loading and error states**
- **Passes data to child components** for rendering

```javascript
// Permission checks
const canViewBilling = hasPermission('manage_billing') || user?.role === 'superAdmin';
const canViewUsers = (hasPermission('view_reports') || user?.role === 'superAdmin') && user?.role !== 'salesRep';
const isSalesRep = user?.role === 'salesRep';

// Conditionally fetch data
if (canViewBilling) {
  // Fetch /api/v1/analytics/billing/overview
}
if (canViewUsers) {
  // Fetch /api/v1/analytics/users/overview
}
```

### 2. Permission-Based Widget Visibility

Each section conditionally renders based on permissions:

```javascript
{/* Revenue Section - Admin with manage_billing only */}
{canViewBilling && (
  <RevenuePerformanceSection data={billingData} />
)}

{/* User Analytics - Admin only (not salesRep) */}
{canViewUsers && (
  <UserAnalyticsSection data={userData} />
)}

{/* SalesRep Performance - SalesReps only */}
{isSalesRep && <SalesRepPerformanceCard leadData={leadData} />}
```

### 3. Role-Specific Stat Cards

The `PlatformHealthCard` adapts its metric cards based on user role:

- **All roles** see:
  - Total Leads
  - Active Packages

- **Admin with `manage_billing`** additionally sees:
  - Monthly Revenue
  - Outstanding Amount

- **Admin (not SalesRep)** additionally sees:
  - Total Users
  - Active Users

## API Endpoints Used

### All Roles Can Access:
```
GET /api/v1/analytics/leads/overview?timeRange={daily|weekly|monthly|annual}
GET /api/v1/analytics/packages/overview?timeRange={daily|weekly|monthly|annual}
```

### Admin with `manage_billing` Can Access:
```
GET /api/v1/analytics/billing/overview?timeRange={daily|weekly|monthly|annual}
```

### Admin Only (Not SalesRep) Can Access:
```
GET /api/v1/analytics/users/overview?timeRange={daily|weekly|monthly|annual}
```

## Data Flow

```
Dashboard.jsx (Page Component)
    ↓
DashboardContainer (Smart Wrapper)
    ├─→ Checks permissions
    ├─→ Fetches appropriate APIs in parallel
    ├─→ Handles loading/error states
    └─→ Passes data to sections
        ├─→ PlatformHealthCard (role-adaptive stat cards)
        ├─→ LeadFunnelSection (all roles)
        ├─→ PackageDistributionSection (all roles)
        ├─→ RevenuePerformanceSection (admin only)
        ├─→ UserAnalyticsSection (admin only)
        └─→ SalesRepPerformanceCard (salesRep only)
```

## Sections Explained

### PlatformHealthCard
**Visible To**: All roles
**Shows**: Stat cards with key metrics
- Adapts metrics based on permissions
- Displays trends (placeholders - can be enhanced)
- Color-coded by metric type

### LeadFunnelSection
**Visible To**: All roles
**Shows**: Line chart of lead progression through sales stages
- X-axis: Time periods (daily/weekly/monthly/annual)
- Y-axis: Lead counts
- Lines: new → contacted → interested → converted

### PackageDistributionSection
**Visible To**: All roles
**Shows**: Pie chart breakdown of packages by category
- Visualizes package popularity
- Color-coded by category
- Shows percentages

### RevenuePerformanceSection
**Visible To**: Admins with `manage_billing` permission only
**Shows**: 
- Bar chart of revenue vs target
- Outstanding amount card
- Potential revenue card
- Key statistics

### UserAnalyticsSection
**Visible To**: Admins ONLY (not salesReps)
**Shows**:
- Area chart of user growth trends
- User statistics cards (total, active, verified)
- Conversion metrics (users with bookings, conversion rate)

### SalesRepPerformanceCard
**Visible To**: SalesReps ONLY
**Shows**:
- Assigned leads count
- Converted leads count
- Personal conversion rate
- Estimated earnings based on commission rate
- CTA to view assigned leads

## Time Range Filtering

Users can change the time range (top right) to view:
- **Daily**: Last 7 days
- **Weekly**: Last 8 weeks
- **Monthly**: Last 6 months (default)
- **Annual**: Last 5 years

All sections update when time range changes (API calls re-trigger).

## Error Handling

### Loading State
- Shows spinner while APIs are being called
- "Loading dashboard data..." message

### Error State
- Error banner with dismissible close button
- Toast notification to user
- Console logs for debugging
- User can dismiss and try again

### No Data State
- Each section shows "No data available" placeholder
- Chart containers remain visible for layout consistency

## Permissions Reference

| Permission | Grants Access To |
|---|---|
| `manage_billing` | Revenue Performance section |
| `view_reports` | All analytics (checked alongside role) |
| `superAdmin` role | All sections (automatic) |
| None (salesRep) | Sales Rep Performance card (role-based) |

## Important Notes

### SalesRep Personal Metrics
Currently using **placeholder values**:
```javascript
const myStats = {
  assignedLeads: 12,        // TODO: Fetch from API filtered by req.user._id
  convertedLeads: 3,        // TODO: Fetch from API
  commissionRate: 5,        // TODO: Fetch from user profile
  estimatedEarnings: 45000  // TODO: Calculate from conversions
};
```

**Next Steps**: Create SalesRep-specific analytics endpoint that returns only the logged-in rep's assigned leads and conversion metrics.

### Styling
- Uses Tailwind CSS classes
- Follows existing design system (blue/green/purple palette)
- Responsive grid layouts (1 col mobile, 2-3 cols desktop)
- Hover effects and transitions for interactivity

### Performance
- **Parallel API Calls**: All requests execute simultaneously (not sequentially)
- **Single Load**: Data loads once on component mount
- **Manual Refresh**: Time range change triggers fresh load (no auto-polling)
- **Error Isolation**: One API failure doesn't block others (Promise.all with catch per request)

## Testing Checklist

When testing the dashboard, verify:

### SuperAdmin
- [ ] Sees all stat cards (Total Leads, Active Packages, Revenue, Outstanding, Users, Active Users)
- [ ] Sees all sections (Lead Funnel, Package Distribution, Revenue, User Analytics)
- [ ] No "locked" or restricted messages
- [ ] Time range filter works

### Admin with `manage_billing`
- [ ] Sees revenue section (other admins without this permission don't)
- [ ] Sees user analytics section
- [ ] Does NOT see SalesRep performance card

### Admin without `manage_billing`
- [ ] Revenue section is hidden
- [ ] User analytics section visible
- [ ] Stat cards only show: Total Leads, Active Packages, Users, Active Users

### SalesRep
- [ ] Sees SalesRep Performance card prominently at top
- [ ] Sees Lead Funnel and Package Distribution sections
- [ ] Revenue and User Analytics sections are hidden
- [ ] Stat cards only show: Total Leads, Active Packages (no billing/user metrics)

## API Integration Notes

The dashboard currently integrates with these analytics endpoints:

1. **Lead Analytics** - Already implemented ✅
2. **Billing Analytics** - Already implemented ✅
3. **Package Analytics** - Already implemented ✅
4. **User Analytics** - Already implemented ✅

The backend (`Server/src/controllers/analytics.controller.js`) already has all required endpoints with proper permission checks.

## Future Enhancements

1. **Export Dashboard Data**: Add CSV/PDF export button (like old dashboard had)
2. **Dashboard Customization**: Allow users to choose which widgets to display
3. **Real-time Updates**: Implement WebSocket for live data updates
4. **Drill-down Capabilities**: Click on chart data to navigate to detailed views
5. **Comparison Views**: "This month vs last month" metrics
6. **SalesRep Specific Endpoint**: Create `/api/v1/analytics/salesreps/me/performance` endpoint

## File Changes Summary

| File | Status | Change |
|---|---|---|
| `Dashboard.jsx` | Modified | Simplified to use DashboardContainer |
| `DashboardContainer.jsx` | Created | Smart wrapper with API integration |
| `PlatformHealthCard.jsx` | Created | Role-adaptive stat cards |
| `LeadFunnelSection.jsx` | Created | Lead progression chart |
| `PackageDistributionSection.jsx` | Created | Package pie chart |
| `RevenuePerformanceSection.jsx` | Created | Revenue bar chart (admin only) |
| `UserAnalyticsSection.jsx` | Created | User metrics (admin only) |
| `SalesRepPerformanceCard.jsx` | Created | Personal KPIs (salesRep only) |
| `LoadingSpinner.jsx` | Created | Loading & error UI components |

---

**Status**: ✅ Phase 1 Complete  
**Date**: December 3, 2025  
**Next Steps**: Test with different user roles, gather feedback, implement SalesRep-specific endpoint
