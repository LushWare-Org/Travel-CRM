# User Analytics - Project Structure & Implementation

## Project Overview

Trip-Sky-Way is a travel/tourism platform with the following main entities:

### Key Models
1. **User Model** (`user.model.js`)
   - Main user collection with fields: name, email, phone, role, isActive, isEmailVerified, etc.
   - Roles: customer, salesRep, vendor, admin, superAdmin
   - Tracks user activity and status

2. **Booking Model** (`booking.model.js`)
   - Records user bookings with user reference
   - Stores travel details, payment status, travelers info
   - Used to determine user conversion (users who made bookings)

3. **Lead Model** (`lead.model.js`)
   - Tracks potential customers (leads)
   - Contains lead source, status, associated sales rep
   - Can be converted to bookings/customers

4. **Package Model** (`package.model.js`)
   - Travel packages available for booking
   - Referenced by bookings and customized packages

## User Analytics Data Structure

### User Status Distribution (Pie Chart)

The "User Status Distribution" displays three key user categories:

```
┌─ Website Users (Total)
│  └─ All registered users in the system
│     Example: 2450 users
│
├─ Registered Users (Active/Verified)
│  └─ Users with verified email addresses
│     Example: 1240 users
│
└─ Converted Users (Engaged)
   └─ Users who have made at least one booking
      Example: 342 users
```

### Data Flow

```
Backend (Server)
└─ GET /api/v1/analytics/users/overview?timeRange=monthly
   ├─ Count total users from User collection
   ├─ Count verified users (isEmailVerified = true)
   ├─ Count users with bookings from Booking collection
   ├─ Calculate conversion rate
   └─ Return structured data

Frontend (Management)
└─ UserAnalytics Component
   ├─ Fetch data from backend API
   ├─ Transform data for charts
   ├─ Display pie chart with userStatusDistribution:
   │  ├─ Website Users: totalUsers
   │  ├─ Registered Users: verifiedUsers
   │  └─ Converted Users: usersWithBookings
   └─ Show statistics and trends
```

## Implementation Details

### Backend Changes (analytics.controller.js)

**Function**: `getUserAnalyticsOverview`

**Query Parameters**:
- `timeRange`: 'daily', 'weekly', 'monthly', 'annual' (default: 'monthly')

**Response Data**:
```javascript
{
  success: true,
  data: {
    timeRange: "monthly",
    generatedAt: "2025-11-15T...",
    stats: {
      totalUsers: 2450,
      activeUsers: 2100,
      inactiveUsers: 350,
      verifiedUsers: 1240,
      unverifiedUsers: 1210,
      usersWithBookings: 342,
      conversionRate: "13.96",
      avgNewUsersPerPeriod: 45
    },
    trendData: [
      {
        label: "Jan",
        totalNewUsers: 45,
        activeUsers: 38,
        verifiedUsers: 25,
        // ... more fields
      },
      // ... more periods
    ],
    roleDistribution: [
      { role: "customer", count: 2000 },
      { role: "vendor", count: 300 },
      { role: "salesRep", count: 100 },
      { role: "admin", count: 50 }
    ],
    topRoles: [
      { role: "customer", count: 2000 },
      // ... top 3 roles
    ],
    statusDistribution: [
      { name: "Active", value: 2100, status: "active" },
      { name: "Inactive", value: 350, status: "inactive" },
      { name: "Verified", value: 1240, status: "verified" },
      { name: "Unverified", value: 1210, status: "unverified" }
    ],
    userStatusDistribution: [
      { 
        name: "Website Users", 
        value: 2450,
        description: "All registered users in the system",
        color: "#3b82f6"
      },
      { 
        name: "Registered Users", 
        value: 1240,
        description: "Users with verified email",
        color: "#10b981"
      },
      { 
        name: "Converted Users", 
        value: 342,
        description: "Users with bookings",
        color: "#f59e0b"
      }
    ]
  }
}
```

### Frontend Changes (UserAnalytics.jsx)

**Features**:
- Real-time data fetching from backend API
- Loading and error states
- Time range filtering (daily, weekly, monthly, yearly)
- Multiple chart types:
  - Line chart: User growth trends
  - Bar charts: Role distribution and performance
  - Pie chart: User status distribution
- Statistics cards showing key metrics
- Summary statistics section
- Top performing roles section

**Data Mapping**:
- Fetches `userStatusDistribution` from backend
- Maps to pie chart with 3 categories:
  - Website Users (blue)
  - Registered Users (green)
  - Converted Users (orange)

## Key Metrics Explained

### Conversion Rate
- **Formula**: (Users with Bookings / Total Users) × 100
- **Example**: (342 / 2450) × 100 = 13.96%
- **Meaning**: 13.96% of all registered users have made at least one booking

### Active Users
- Users with `isActive = true` in the database
- Includes users who have logged in or haven't been deactivated

### Verified Users
- Users with `isEmailVerified = true`
- Shows email confirmation status
- Indicates level of user engagement during registration

### Role Distribution
- Breaks down users by assigned role
- Typically: customer (majority) > vendor > salesRep > admin

## API Route

**Endpoint**: `GET /api/v1/analytics/users/overview`

**Authentication**: Required (JWT Token)

**Authorization**: Admin only

**Query Parameters**:
```
?timeRange=monthly
?timeRange=weekly
?timeRange=daily
?timeRange=annual
```

**Example Request**:
```bash
curl -X GET "http://localhost:5000/api/v1/analytics/users/overview?timeRange=monthly" \
  -H "Authorization: Bearer <your-jwt-token>"
```

## Frontend Service

**File**: `src/services/analytics.service.js`

**Method**: `getUserAnalyticsOverview(timeRange)`

```javascript
const data = await AnalyticsService.getUserAnalyticsOverview('monthly');
```

## Testing the Integration

1. **Start Backend Server**:
   ```bash
   cd Server
   npm run dev
   # Runs on http://localhost:5000
   ```

2. **Start Frontend Server**:
   ```bash
   cd Management
   npm run dev
   # Runs on http://localhost:3001
   ```

3. **Navigate to User Analytics**:
   - Go to http://localhost:3001
   - Navigate to Analytics > User Management Analytics
   - Select time range from dropdown
   - View charts and statistics

4. **Verify Data**:
   - Check pie chart shows Website Users, Registered Users, Converted Users
   - Verify conversion rate matches formula
   - Check time range changes update all charts

## Troubleshooting

### Chart Shows Mock Data
- **Cause**: API request failed or component is in error state
- **Solution**: Check browser console for errors, verify backend is running

### Data Not Updating on Time Range Change
- **Cause**: Component not re-fetching data
- **Solution**: Verify useEffect dependency includes timeRange

### Wrong User Counts
- **Cause**: Database queries not filtering correctly
- **Solution**: Verify Booking model has correct userId reference

## Future Enhancements

1. Add more detailed role analytics
2. Include revenue metrics from bookings
3. Add user retention/churn analysis
4. Implement custom date range selection
5. Add export functionality (CSV, PDF)
6. Real-time updates with WebSocket
