# Sales Rep Billing Access Implementation

## Overview
Sales representatives can now access the Billing section and view only their assigned leads' billing items (quotations, invoices, and receipts). This is a controlled read-only access with lead-based filtering.

## Changes Made

### 1. Frontend Permission System Update
**File**: `Management/src/contexts/PermissionContext.jsx`

#### Added New Permission
- **Permission ID**: `view_billing`
- **Label**: "View Billing"
- **Category**: Finance
- **Description**: "View billing documents for assigned leads (read-only)"
- **Scope**: Sales reps can use this permission to access the Billing section

```javascript
VIEW_BILLING: 'view_billing'

[PERMISSION_LIST.VIEW_BILLING]: {
  id: 'view_billing',
  label: 'View Billing',
  category: 'Finance',
  description: 'View billing documents for assigned leads (read-only)',
}
```

### 2. Sidebar Navigation Update
**File**: `Management/src/pages/Sidebar.jsx`

#### Updated Billing Link Access Control
Changed from simple `requiredPermission: "manage_billing"` to a custom check that:
- **SuperAdmins**: Always have access
- **Sales Reps**: Can access with `view_billing` permission
- **Regular Admins**: Need `manage_billing` permission

```javascript
{ 
  icon: DollarSign, 
  label: "Billing", 
  path: "/billing", 
  requiredPermission: null,
  customCheck: (userRole, userIsSuperAdmin, hasPermission) => {
    // SuperAdmins always have access
    if (userRole === 'superAdmin' && userIsSuperAdmin === true) return true;
    // Sales reps can view billing with view_billing permission
    if (userRole === 'salesRep') return hasPermission('view_billing');
    // Regular admins need manage_billing permission
    if (userRole === 'admin') return hasPermission('manage_billing');
    return false;
  }
}
```

### 3. Backend RBAC Permission Mapping
**File**: `Server/src/middleware/rbac.js`

#### Added Permission Mapping
Added mapping for billing:view action to the view_billing permission:
```javascript
'billing:view': 'view_billing',
```

### 4. Backend Filtering (Already Implemented)
The following controllers already have lead-based filtering for sales reps:
- `Server/src/controllers/invoice.controller.js`
- `Server/src/controllers/quotation.controller.js`
- `Server/src/controllers/paymentReceipt.controller.js`

#### Filtering Logic
```javascript
if (req.user.role === 'salesRep') {
  const assignedLeadIds = await Lead.find({ assignedTo: req.user._id }).select('_id').lean();
  const leadIds = assignedLeadIds.map((lead) => lead._id);
  baseQuery = baseQuery.where('lead').in(leadIds);
}
```

### 5. Frontend Component (No Changes Needed)
**File**: `Management/src/pages/BillingInvoicing.jsx`

The component already:
- Calls `invoiceAPI.getAll()`, `quotationAPI.getAll()`, and `receiptAPI.getAll()`
- Server automatically filters results based on user role
- No admin-only create/delete functionality in the UI
- Sales reps can view, send, and download billing documents

## Data Access Flow

```
Sales Rep Logs In
     ↓
System assigns 'view_billing' permission (via backend admin config)
     ↓
Sales Rep Navigates to Sidebar
     ↓
Billing Link shows if user has view_billing permission
     ↓
Clicks on Billing
     ↓
BillingInvoicing component loads
     ↓
Component calls API endpoints (getAll)
     ↓
Backend checks: if role === 'salesRep' → filter by assignedTo
     ↓
Returns only items for leads assigned to this sales rep
     ↓
Sales rep sees only their billing items
```

## Authorization Checks

### Frontend Navigation
- **Sidebar**: Only shows Billing link if user has `view_billing` permission
- **Custom Check**: Runs before component render to prevent unauthorized access

### Backend Routes
All billing endpoints are protected with:
- `protect` middleware (requires authentication)
- Lead-based filtering in controllers (prevents cross-rep data access)
- Optional `authorize('admin', 'salesRep')` on specific endpoints

### Available Actions for Sales Reps
✅ **View (Read)**
- View all quotations for assigned leads
- View all invoices for assigned leads
- View all receipts for assigned leads
- Download PDFs

✅ **Create/Update**
- Create quotations for assigned leads
- Create invoices from quotations
- Record payments
- Update draft documents

✅ **Send**
- Send quotations to customers
- Send invoices to customers
- Send receipts

❌ **Restricted (Admin Only)**
- Cancel invoices
- Verify payments
- Reconcile payments
- Approve/reject quotations
- View financial reports
- Export billing data

## Permission Assignment

### For a Sales Rep to Access Billing:
1. Admin creates a Sales Rep user account
2. Admin assigns leads to the Sales Rep via Lead Management
3. Admin assigns `view_billing` permission to the Sales Rep
4. Sales Rep can now:
   - See the Billing link in the sidebar
   - Access only their assigned leads' billing items
   - Perform allowed actions on those items

### Default Behavior
- Sales Reps without `view_billing` permission: Billing link is hidden
- Admins without `manage_billing` permission: Billing link is hidden
- SuperAdmins: Always see Billing link (no permission needed)

## Security Features

1. **Frontend Access Control**: Sidebar hides billing link if user lacks permission
2. **Backend Filtering**: Every API call filters by `assignedTo` for sales reps
3. **Authorization Checks**: Get-by-ID endpoints verify sales rep has permission to access specific item
4. **No Privilege Escalation**: Sales reps cannot access leads assigned to others
5. **Audit Trail**: All actions logged through existing audit middleware

## Testing Checklist

- [ ] Create/assign a sales rep user
- [ ] Assign leads to the sales rep
- [ ] Grant `view_billing` permission to the sales rep
- [ ] Log in as sales rep
- [ ] Verify Billing link appears in sidebar
- [ ] Click Billing link and verify page loads
- [ ] Verify only assigned leads' quotations/invoices/receipts appear
- [ ] Try accessing another sales rep's invoice via direct URL (should get 403)
- [ ] Verify sales rep can download PDFs
- [ ] Verify sales rep can send documents
- [ ] Log in as admin with `manage_billing` permission
- [ ] Verify admin sees all invoices/quotations/receipts
- [ ] Log in as user without billing permission
- [ ] Verify Billing link is hidden

## Related Files Modified

1. `Management/src/contexts/PermissionContext.jsx` - Added VIEW_BILLING permission
2. `Management/src/pages/Sidebar.jsx` - Updated Billing navigation with permission check
3. `Server/src/middleware/rbac.js` - Added billing:view permission mapping

## Related Files (Already Configured)

1. `Server/src/controllers/invoice.controller.js` - Filters by assignedTo
2. `Server/src/controllers/quotation.controller.js` - Filters by assignedTo
3. `Server/src/controllers/paymentReceipt.controller.js` - Filters by assignedTo
4. `Server/src/routes/invoice.routes.js` - Allows salesRep on appropriate endpoints
5. `Server/src/routes/quotation.routes.js` - Allows salesRep on appropriate endpoints
6. `Server/src/routes/paymentReceipt.routes.js` - Allows salesRep on appropriate endpoints
7. `Management/src/pages/BillingInvoicing.jsx` - No changes needed

## Commission Tracking (Future Enhancement)

Consider adding to the Billing dashboard for sales reps:
- Commission calculation based on invoices created
- Commission percentage configuration per sales rep
- Commission payment tracking
- Performance metrics (conversion rate, total invoice value, etc.)

## Next Steps

1. **Grant Permission to Sales Reps**: Admin assigns `view_billing` permission to sales reps in the User Management section
2. **Assign Leads**: Admin assigns leads to sales reps in Lead Management
3. **Test**: Follow the Testing Checklist above
4. **Monitor**: Check audit logs for any unauthorized access attempts

