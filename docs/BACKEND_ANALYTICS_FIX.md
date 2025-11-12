# Fix Summary: Backend Analytics Controller Error

## Problem
The backend analytics controller was throwing a `ReferenceError: require is not defined` error when trying to fetch user analytics data.

## Root Cause
The controller file uses ES6 module syntax (`import`/`export`) but had `require()` statements inside async functions to import the User model. This is not valid in ES6 modules.

## Solution
Moved the User model import from inside the async functions to the top-level imports alongside the Lead and Invoice models.

## Changes Made

### File: `Server/src/controllers/analytics.controller.js`

#### 1. Added User Model Import
**Before:**
```javascript
import Lead from '../models/lead.model.js';
import Invoice from '../models/invoice.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import { COUNTRY_NAMES, normalizeString } from '../utils/countryUtils.js';
```

**After:**
```javascript
import Lead from '../models/lead.model.js';
import Invoice from '../models/invoice.model.js';
import User from '../models/user.model.js';
import asyncHandler from '../utils/asyncHandler.js';
import { COUNTRY_NAMES, normalizeString } from '../utils/countryUtils.js';
```

#### 2. Fixed `getUserAnalyticsOverview` Function
**Removed line:**
```javascript
const User = require('../models/user.model.js').default;
```

The User model is now imported at the top of the file.

#### 3. Fixed `getSalesRepPerformanceAnalytics` Function
**Removed lines:**
```javascript
const User = require('../models/user.model.js').default;
const LeadModel = Lead;
```

**Updated references:**
- Changed all `LeadModel.countDocuments()` to `Lead.countDocuments()`
- User model is now imported at the top of the file

## Testing
The backend should now correctly handle requests to:
- `GET /api/v1/analytics/users/overview?timeRange=monthly`
- `GET /api/v1/analytics/sales-reps/performance?timeRange=monthly`

## Status
✅ Fixed - Backend controller now uses proper ES6 module syntax throughout
