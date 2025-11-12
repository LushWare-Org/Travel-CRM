# User Analytics Backend Implementation

## Overview
Developed complete backend support for the User Analytics page in the Management panel. The system provides real-time user growth metrics, sales representative performance analytics, and user distribution data with support for multiple time ranges (daily, weekly, monthly, annual).

## Architecture

### Backend Components

#### 1. **Analytics Controller** (`Server/src/controllers/analytics.controller.js`)

New endpoints added:

##### `getUserAnalyticsOverview`
- **Route**: `GET /api/v1/analytics/users/overview`
- **Access**: Admin only
- **Query Parameters**:
  - `timeRange`: 'daily', 'weekly', 'monthly', 'annual' (default: monthly)

**Data Returned**:
```javascript
{
  success: true,
  data: {
    timeRange: string,
    generatedAt: ISO timestamp,
    stats: {
      totalNewUsers: number,
      totalPurchased: number (email verified users as proxy),
      totalActiveUsers: number,
      totalSalesReps: number,
      conversionRate: percentage,
      avgSalesReps: decimal,
      usersTrend: percentage,
      purchasedTrend: percentage
    },
    trend: Array<{
      label: string,
      month: string,
      week: string,
      year: string,
      newUsers: number,
      purchased: number,
      salesReps: number
    }>,
    roleDistribution: Array<{ _id: role, count: number }>,
    topPerformers: Array<{ _id, name, email }>,
    userTypeDistribution: Array<{ name, value }>
  }
}
```

**Implementation Details**:
- Aggregates User model data by time range (daily/weekly/monthly/annual)
- Tracks new customer registrations
- Counts active sales representatives
- Calculates conversion rates using email verification as proxy
- Uses MongoDB aggregation pipeline for efficient time-based grouping
- Supports ISO week calculations for weekly analytics

##### `getSalesRepPerformanceAnalytics`
- **Route**: `GET /api/v1/analytics/sales-reps/performance`
- **Access**: Admin only
- **Query Parameters**:
  - `timeRange`: 'daily', 'weekly', 'monthly', 'annual' (default: monthly)
  - `limit`: Max number of top performers to return (default: 5, max: 20)

**Data Returned**:
```javascript
{
  success: true,
  data: {
    timeRange: string,
    generatedAt: ISO timestamp,
    performance: Array<{
      _id: ObjectId,
      name: string,
      email: string,
      sales: number,
      convertedLeads: number,
      conversion: percentage,
      revenue: number (currently 0)
    }>,
    revenueRanking: Array (same as performance),
    stats: {
      totalSalesReps: number,
      avgConversion: percentage,
      topPerformer: string (name),
      topPerformerRevenue: number
    }
  }
}
```

**Implementation Details**:
- Queries all active sales representatives
- For each rep, counts total leads assigned (using salesRep name field)
- Counts converted leads (status === 'converted')
- Calculates conversion percentage
- Sorts by performance metrics
- Limited to top performers for efficiency

#### 2. **Analytics Routes** (`Server/src/routes/analytics.routes.js`)

Updated routes file:
```javascript
router.get('/users/overview', protect, authorize('admin'), getUserAnalyticsOverview);
router.get('/sales-reps/performance', protect, authorize('admin'), getSalesRepPerformanceAnalytics);
```

### Frontend Components

#### 1. **Analytics Service** (`Management/src/services/analytics.service.js`)

Service class managing:
- API communication with backend
- Data transformation
- Response caching (5-minute TTL)
- Error handling

**Key Methods**:
```javascript
getUserAnalyticsOverview(params)  // Fetch user analytics
getSalesRepPerformance(params)    // Fetch sales rep analytics
transformUserAnalytics(data)      // Transform for frontend
transformSalesRepPerformance(data) // Transform for frontend
clearCache(type)                  // Clear specific or all cache
```

#### 2. **API Service Updates** (`Management/src/services/api.js`)

Extended `analyticsAPI` object with:
```javascript
getUserOverview(params)           // API call for user analytics
getSalesRepPerformance(params)    // API call for sales rep performance
```

#### 3. **Custom Hook** (`Management/src/features/analytics/hooks/useUserAnalytics.js`)

Provides multiple hooks for consuming analytics data:

```javascript
// Main hook - fetches both user and sales rep data
useUserAnalytics(timeRange)

// Specialized hooks
useUserGrowthTrend(timeRange)     // User growth trend data
useUserStats(timeRange)            // User statistics
useSalesRepPerformance(timeRange)  // Sales rep performance
useUserTypeDistribution(timeRange)  // User type breakdown
```

**Features**:
- Automatic data fetching on mount and timeRange change
- Loading and error states
- Cache management
- Refetch capability
- Data transformation

#### 4. **UserAnalytics Component** (`Management/src/features/analytics/components/UserAnalytics/UserAnalytics.jsx`)

Updated component with:
- **Real Data Integration**: Fetches from backend API instead of mock data
- **Loading State**: Shows spinner while fetching
- **Error Handling**: Displays error alert with retry button
- **Dynamic Charts**:
  - User growth trend (line chart)
  - Sales rep performance (bar chart)
  - Revenue by sales rep (bar chart)
  - User type distribution (pie chart)
- **Time Range Support**: Daily, weekly, monthly, annual analytics
- **Statistics Cards**:
  - New Users
  - Users Purchased
  - Successful Sales
  - Revenue/Rep Average

## Data Flow

```
UserAnalytics Component
    ↓
useUserAnalytics Hook
    ↓
AnalyticsService
    ↓
API Service (analyticsAPI)
    ↓
Backend Routes (/analytics/users/overview, /analytics/sales-reps/performance)
    ↓
Analytics Controller (getUserAnalyticsOverview, getSalesRepPerformanceAnalytics)
    ↓
MongoDB Aggregation Pipelines
    ↓
User & Lead Models
    ↓
Database Query Results
```

## Key Features

### 1. **Time Range Support**
- **Daily**: Last 7 days
- **Weekly**: Last 8 weeks
- **Monthly**: Last 6 months (default)
- **Annual**: Last 5 years

### 2. **Performance Optimizations**
- MongoDB aggregation pipelines for efficient data grouping
- Response caching with 5-minute TTL
- Only fetching required fields from database
- Limiting top performers queries

### 3. **Data Accuracy**
- Uses actual user creation dates
- Tracks sales rep leads by name matching
- Converts email verification status as proxy for purchases (can be enhanced)
- Real-time data from database

### 4. **Error Handling**
- Try-catch blocks in all async operations
- User-friendly error messages
- Retry functionality in component
- Graceful fallbacks to empty states

## Limitations & Notes

⚠️ **Known Limitations**:
1. **"Users Purchased"**: Currently uses email-verified users as a proxy since explicit purchase tracking isn't directly available in the User model
2. **Revenue Data**: Currently returns 0 for revenue per sales rep - requires Invoice/Booking model integration
3. **Sales Rep Assignment**: Uses the `salesRep` string field (name) in Leads model, not an ObjectId reference

## Integration Checklist

✅ Backend controller functions created  
✅ Analytics routes added and exported  
✅ Frontend API service updated  
✅ Analytics service created  
✅ Custom hooks implemented  
✅ UserAnalytics component updated  
✅ Real data integration complete  
✅ Error handling implemented  
✅ Loading states handled  
✅ Caching strategy implemented  

## Testing Endpoints

```bash
# Get user analytics overview
GET /api/v1/analytics/users/overview?timeRange=monthly

# Get sales rep performance
GET /api/v1/analytics/sales-reps/performance?timeRange=monthly&limit=5

# With different time ranges
GET /api/v1/analytics/users/overview?timeRange=daily
GET /api/v1/analytics/users/overview?timeRange=weekly
GET /api/v1/analytics/users/overview?timeRange=annual
```

## Future Enhancements

1. **Revenue Tracking**: Integrate with Invoice/Booking models to provide actual revenue data
2. **Purchase Tracking**: Add explicit purchase flag or transaction tracking to User model
3. **Performance Optimization**: Implement Redis caching for frequently accessed analytics
4. **Export Functionality**: Add CSV/Excel export for analytics data
5. **Advanced Filtering**: Support date range selection beyond predefined intervals
6. **Real-time Updates**: WebSocket support for live analytics updates
7. **Comparison Views**: Year-over-year or month-over-month comparisons
8. **Drill-down Analytics**: Detailed analytics for individual sales reps or user segments

## File Changes Summary

### New Files Created:
- `Management/src/services/analytics.service.js`
- `Management/src/features/analytics/hooks/useUserAnalytics.js`

### Files Modified:
- `Server/src/controllers/analytics.controller.js` (+ 2 new functions)
- `Server/src/routes/analytics.routes.js` (+ 2 new routes)
- `Management/src/services/api.js` (+ 2 new API methods)
- `Management/src/features/analytics/components/UserAnalytics/UserAnalytics.jsx` (complete refactor for real data)

## Dependencies

No new npm packages required - using existing dependencies:
- React hooks (useState, useEffect, useCallback, useMemo)
- Lucide React icons
- Tailwind CSS for styling
- Axios (via API service)
- MongoDB aggregation operators
