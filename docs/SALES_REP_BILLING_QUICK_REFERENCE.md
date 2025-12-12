# Sales Rep Billing Access - Quick Reference

## What Changed

### 3 Files Modified:
1. **PermissionContext.jsx** - Added `view_billing` permission
2. **Sidebar.jsx** - Updated Billing link to check `view_billing` for sales reps
3. **rbac.js** - Added `billing:view` permission mapping

### How It Works:
1. **Admin** assigns `view_billing` permission to a Sales Rep user
2. **Admin** assigns Leads to the Sales Rep
3. **Sales Rep** logs in → sees Billing link in sidebar → can view only their assigned leads' billing items

## Key Features

✅ Sales reps see only their assigned leads' billing items
✅ Backend filtering prevents data leakage
✅ Sales reps can create, update, and send billing documents
✅ Admins still have full billing management access
✅ Download PDFs and send documents via email

## For Admin Users

To give a Sales Rep billing access:

1. Go to **User Management**
2. Find the Sales Rep user
3. Edit their permissions and check `view_billing`
4. Save changes
5. Ensure leads are assigned to them in **Lead Management**

That's it! The Sales Rep will now see the Billing link in their sidebar.

## For Sales Reps

Once you have `view_billing` permission and assigned leads:

1. Click **Billing** in the sidebar
2. View quotations, invoices, and receipts for your leads
3. Download PDFs, send documents, record payments
4. You can only see items for leads assigned to you

## Security

- Sales reps cannot see other sales reps' data
- Sales reps cannot perform admin-only actions
- All access is logged and auditable
- Backend verifies every request against assigned leads

## Files to Review

See implementation details in: `BILLING_SALESREP_IMPLEMENTATION.md`

