# Sales Rep Billing Access - Fix Applied

## Problem
Sales rep users could not see the Billing section in the sidebar even though the `view_billing` permission was created and the Sidebar component was updated to check for it.

## Root Cause
The `view_billing` permission was not being:
1. Added to the valid permissions list in the User model
2. Automatically assigned when creating new sales reps
3. Assigned to existing sales rep users

## Solution Applied

### 1. Updated User Model
**File**: `Server/src/models/user.model.js`

Added `view_billing` to the valid permissions list:
```javascript
const validPermissions = [
  'manage_users',
  'manage_sales_reps',
  'manage_vendors',
  'manage_admins',
  'view_reports',
  'manage_billing',
  'view_billing',  // ← NEW
  'manage_leads',
  'manage_packages',
];
```

### 2. Updated Sales Rep Creation
**File**: `Server/src/controllers/salesRep.controller.js`

When creating a new sales rep, automatically assign `view_billing` and `manage_leads` permissions:
```javascript
permissions: ['manage_leads', 'view_billing'],
```

### 3. Updated Admin User Creation
**File**: `Server/src/controllers/admin.controller.js`

When creating a sales rep through the admin panel, assign the same permissions:
```javascript
permissions: role === 'salesRep' ? ['manage_leads', 'view_billing'] : ...
```

### 4. Created Migration Script
**File**: `Server/scripts/add-view-billing-permission.js`

Migrated all existing sales rep users to have the `view_billing` permission.

**Results**:
- ✓ Amal (amal@tripskyway.com) - Updated
- ✓ hasath (silvahasath@gmail.com) - Updated
- ✓ Malinga (anuradhaanupamaherath@gmail.com) - Updated
- ✓ malinga (maling7@gmail.com) - Updated

## What to Do Now

1. **Clear browser cache/localStorage** (optional but recommended):
   - DevTools → Application → Clear Site Data
   - Or just close and reopen the browser

2. **Log out from the Management portal**

3. **Log back in as a sales rep**

4. **Check the sidebar** - You should now see the **Billing** link

## Verification

After logging back in as a sales rep (e.g., Amal):
- ✓ Billing link should appear in the sidebar
- ✓ Clicking it should load the Billing page
- ✓ You should see only your assigned leads' quotations, invoices, and receipts

## How It Works Now

1. When a sales rep logs in:
   - Backend returns their user object with `permissions: ['view_billing', 'manage_leads']`
   - Frontend PermissionContext loads these permissions
   - Sidebar checks `hasPermission('view_billing')` for sales reps
   - If true, Billing link displays; if false, it's hidden

2. When accessing billing items:
   - Backend filters by `assignedTo: sales_rep_id`
   - Sales rep only sees their own leads' billing data

## All Changes Summary

### Modified Files:
1. `Server/src/models/user.model.js` - Added view_billing to valid permissions
2. `Server/src/controllers/salesRep.controller.js` - Assign permissions on creation
3. `Server/src/controllers/admin.controller.js` - Assign permissions on creation

### New Files:
1. `Server/scripts/add-view-billing-permission.js` - Migration script

### No Frontend Changes Needed:
- `Management/src/contexts/PermissionContext.jsx` - Already correct ✓
- `Management/src/pages/Sidebar.jsx` - Already correct ✓
- `Management/src/pages/BillingInvoicing.jsx` - Already correct ✓

## Testing

The sales rep "Amal" now has `view_billing` permission. Test the flow:

1. Log in as: `amal@tripskyway.com` (password: check email or reset)
2. Verify Billing link appears in sidebar
3. Click Billing
4. Verify you see only your assigned leads' items
5. Try to download a PDF or send a document
6. Verify admin (with manage_billing permission) still sees all billing items

