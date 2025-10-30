# 🚀 Quick Start Guide - Enhanced Billing System

## Getting Started in 5 Minutes

### Step 1: Access the Billing System
Navigate to `/billing` or click "Billing & Invoicing" in your dashboard.

### Step 2: Understand the Three Tabs

```
┌─────────────────────────────────────────────────────┐
│ [Quotations] [Invoices] [Payment Receipts]         │
└─────────────────────────────────────────────────────┘
```

## Quick Actions

### 📝 Create a Quotation

1. Click **Quotations** tab
2. Click **"New Quotation"** button
3. **Search for Lead**:
   - Type customer name or Lead ID
   - Select from dropdown
4. **Fill Package Details**:
   - Package name: "Bali Adventure Tour"
   - Valid until date
5. **Add Line Items**:
   - Click "+ Add Item"
   - Description: "Flight Tickets"
   - Quantity: 2
   - Rate: $500
   - (Amount auto-calculated: $1000)
6. **Set Tax & Discount** (optional)
7. Click **"Create Quotation"**

✅ **Result**: Quotation created with ID `QUO-001`, linked to lead

---

### 📄 Convert Quotation to Invoice

**Prerequisites**: You have an **Accepted** quotation

1. Go to **Quotations** tab
2. Find your accepted quotation
3. Click **"Invoice"** button (green button on the right)
4. Review auto-filled data
5. Adjust if needed
6. Click **"Create Invoice"**

✅ **Result**: Invoice created from quotation, all data preserved

---

### 🧾 Create an Invoice Directly

1. Click **Invoices** tab
2. Click **"New Invoice"** button
3. **Search for Lead**
4. **Optional**: Link to accepted quotation (auto-fills everything)
   - OR fill manually
5. Add line items
6. Set due date
7. Click **"Create Invoice"**

✅ **Result**: Invoice created with ID `INV-001`

---

### 💵 Record a Payment

**Prerequisites**: You have an unpaid or partially paid invoice

1. Click **Payment Receipts** tab
2. Click **"New Receipt"** button
3. **Search for Lead**
4. **Select Invoice** (shows only unpaid invoices for this lead)
5. **Invoice Summary** appears:
   ```
   Invoice Total:      $2,100
   Previous Payments:  $500
   Balance Due:        $1,600
   ```
6. **Enter Payment Details**:
   - Payment Amount: $1,600
   - Payment Method: "Credit Card"
   - Payment Date: (today's date)
   - Transaction ID: Click "Generate"
7. **Status Auto-Determined**:
   - Shows "Paid in Full" (if full payment)
   - Shows "Paid in Advance" (if partial)
8. Click **"Create Receipt"**

✅ **Result**: Receipt created, invoice status updated to "Paid"

---

## Common Workflows

### Workflow 1: Complete Sales Cycle

```
Lead Created (Lead Management)
    ↓
Create Quotation → Send to Customer
    ↓
Customer Accepts
    ↓
Convert to Invoice → Send to Customer
    ↓
Receive Payment → Create Receipt
    ↓
✅ Payment Confirmed
```

**Time**: ~5 minutes per lead

### Workflow 2: Quick Invoice (No Quotation)

```
Lead Created
    ↓
Create Invoice Directly
    ↓
Receive Payment → Create Receipt
    ↓
✅ Done
```

**Time**: ~3 minutes per lead

---

## Search & Filter Tips

### 🔍 Smart Search
Type any of these:
- Lead ID: `LEAD-001`
- Customer Name: `John Doe`
- Document ID: `INV-001`
- Package Name: `Paris`

### 🎯 Status Filters

**Quotations**:
- All Status, Draft, Sent, Accepted, Rejected, Expired

**Invoices**:
- All Status, Draft, Sent, Paid, Partial, Overdue, Cancelled

**Receipts**:
- All Status, Paid in Advance, Paid in Full

---

## Action Buttons Explained

| Icon | Action | Available For |
|------|--------|---------------|
| 👁️ Eye | View Details | All |
| ✏️ Edit | Edit Document | Draft status |
| 🗑️ Delete | Delete | All |
| ⬇️ Download | Download PDF | All |
| 📧 Send | Email to Customer | All |
| 📋 Copy | Duplicate | Quotations |
| 🧾 Invoice | Convert to Invoice | Accepted Quotations |

---

## Pro Tips

### ✨ Best Practices

1. **Always Create Quotations First**
   - Professional approach
   - Better tracking
   - Easy conversion to invoice

2. **Use Lead Search**
   - Type partial name
   - Auto-fills customer data
   - Ensures data consistency

3. **Link Documents**
   - Quotation → Invoice → Receipt
   - Complete audit trail
   - Easy tracking

4. **Record Payments Immediately**
   - Create receipt right away
   - Automatic balance tracking
   - Updated invoice status

5. **Use Transaction IDs**
   - Click "Generate" for auto-ID
   - Or enter manual reference
   - Easy payment tracking

### ⚡ Keyboard Shortcuts

- Search: Focus search bar immediately
- Tab: Switch between tabs (with arrows)
- Esc: Close modal forms
- Enter: Submit forms

---

## Status Indicators

### Color Codes

**Quotations**:
- 🔵 Blue = Sent
- 🟢 Green = Accepted
- 🔴 Red = Rejected
- 🟠 Orange = Expired
- ⚪ Gray = Draft

**Invoices**:
- 🟢 Green = Paid
- 🔵 Blue = Partial
- 🟡 Yellow = Sent
- 🔴 Red = Overdue
- ⚪ Gray = Draft
- ⚫ Black = Cancelled

**Receipts**:
- 🔵 Blue = Paid in Advance
- 🟢 Green = Paid in Full

---

## Common Questions

### Q: Can I edit an invoice after sending?
**A**: Only draft invoices can be edited. Create a new invoice or add notes for changes.

### Q: What if I receive partial payment?
**A**: Create a receipt with the partial amount. Status auto-updates to "Paid in Advance". The balance is calculated automatically.

### Q: Can I invoice without a quotation?
**A**: Yes! Click "New Invoice" and create directly. Quotations are optional.

### Q: How do I track a lead's payment history?
**A**: Use search with Lead ID. All documents linked to that lead will appear.

### Q: Can I delete a payment receipt?
**A**: Yes, but the invoice status won't auto-update. Manually adjust invoice if needed.

---

## Example: Complete Transaction

Let's create a complete transaction for "Sarah Johnson":

```
1. Quotation (QUO-005)
   Lead: LEAD-042 - Sarah Johnson
   Package: "Tokyo Cherry Blossom Tour"
   Amount: $3,500
   Status: Draft → Sent → Accepted
   ⏱️ Time: 2 minutes

2. Invoice (INV-018)
   Converted from QUO-005
   All data auto-filled
   Due Date: Nov 14, 2025
   Status: Draft → Sent
   ⏱️ Time: 30 seconds

3. Receipt #1 (REC-023)
   Invoice: INV-018
   Amount: $1,000
   Method: Bank Transfer
   Status: Paid in Advance
   Balance: $2,500
   ⏱️ Time: 1 minute

4. Receipt #2 (REC-028)
   Invoice: INV-018
   Amount: $2,500
   Method: Credit Card
   Status: Paid in Full
   Balance: $0
   ⏱️ Time: 1 minute

✅ COMPLETE: Total time: ~4.5 minutes
```

---

## Troubleshooting

### Issue: Lead not appearing in search
**Solution**: Ensure lead is created in Lead Management first

### Issue: No invoices to select for receipt
**Solution**: Create an invoice for the lead first

### Issue: Status not updating
**Solution**: Check that amounts and dates are filled correctly

### Issue: Can't convert quotation to invoice
**Solution**: Ensure quotation status is "Accepted"

---

## Next Steps

1. ✅ Create your first quotation
2. ✅ Convert it to an invoice
3. ✅ Record a payment receipt
4. 📖 Read the full documentation: `ENHANCED_BILLING_README.md`
5. 🏗️ Explore advanced features

---

## Need Help?

- 📚 Full Documentation: `ENHANCED_BILLING_README.md`
- 🏛️ Architecture: `ARCHITECTURE.md`
- 🔧 Technical Guide: Component docs in `/components`

**Happy Billing! 🎉**

---

*Last Updated: October 30, 2025*
