# 🎯 Enhanced Billing System - Developer Quick Reference

## 🚀 Quick Start

```bash
# 1. The main page is ready
# Location: Management/src/pages/EnhancedBillingInvoicing.jsx

# 2. Add to your routes
import EnhancedBillingInvoicing from './pages/EnhancedBillingInvoicing';

# 3. Use in routing
<Route path="/billing" component={EnhancedBillingInvoicing} />

# 4. Start dev server
npm run dev

# 5. Navigate to /billing
```

## 📁 File Locations

| Component | Path |
|-----------|------|
| Main Page | `pages/EnhancedBillingInvoicing.jsx` |
| Tab Navigation | `features/billing/components/TabNavigation.jsx` |
| Quotations Table | `features/billing/components/QuotationsTable.jsx` |
| Receipts Table | `features/billing/components/PaymentReceiptsTable.jsx` |
| Quotation Form | `features/billing/components/form/QuotationForm.jsx` |
| Invoice Form | `features/billing/components/form/EnhancedInvoiceForm.jsx` |
| Receipt Form | `features/billing/components/form/PaymentReceiptForm.jsx` |
| Types | `features/billing/types/index.js` |

## 🎨 Component Usage

### Import Components
```javascript
import {
  TabNavigation,
  QuotationsTable,
  PaymentReceiptsTable,
  QuotationForm,
  EnhancedInvoiceForm,
  PaymentReceiptForm
} from '../features/billing/components';
```

### Import Types
```javascript
import {
  QUOTATION_STATUS,
  INVOICE_STATUS,
  RECEIPT_STATUS,
  PAYMENT_METHODS
} from '../features/billing/types';
```

## 🔧 Key Props

### TabNavigation
```javascript
<TabNavigation
  activeTab="quotations"  // 'quotations' | 'invoices' | 'receipts'
  onTabChange={(tab) => setActiveTab(tab)}
  counts={{
    quotations: 15,
    invoices: 12,
    receipts: 8
  }}
/>
```

### QuotationsTable
```javascript
<QuotationsTable
  quotations={quotations}
  onView={(q) => {}}
  onEdit={(q) => {}}
  onDelete={(q) => {}}
  onDownload={(q) => {}}
  onSend={(q) => {}}
  onDuplicate={(q) => {}}
  onConvertToInvoice={(q) => {}}
/>
```

### PaymentReceiptsTable
```javascript
<PaymentReceiptsTable
  receipts={receipts}
  onView={(r) => {}}
  onEdit={(r) => {}}
  onDelete={(r) => {}}
  onDownload={(r) => {}}
  onSend={(r) => {}}
/>
```

### Forms
```javascript
<QuotationForm
  formData={formData}
  setFormData={setFormData}
  onSave={() => {}}
  onCancel={() => {}}
  leads={leads}
/>

<EnhancedInvoiceForm
  formData={formData}
  setFormData={setFormData}
  onSave={() => {}}
  onCancel={() => {}}
  leads={leads}
  quotations={acceptedQuotations}
/>

<PaymentReceiptForm
  formData={formData}
  setFormData={setFormData}
  onSave={() => {}}
  onCancel={() => {}}
  leads={leads}
  invoices={unpaidInvoices}
/>
```

## 📊 Data Structures

### Quotation
```javascript
{
  id: "QUO-001",
  leadId: "LEAD-001",          // Required
  leadName: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
  packageName: "Tour Package",
  amount: 1000,
  tax: 10,                     // percentage
  discount: 5,                 // percentage
  total: 1050,
  status: "draft",             // see QUOTATION_STATUS
  validUntil: "2025-11-30",
  issuedDate: "2025-10-30",
  items: [
    { description: "Item", quantity: 1, rate: 1000, amount: 1000 }
  ],
  notes: "",
  termsConditions: ""
}
```

### Invoice
```javascript
{
  id: "INV-001",
  leadId: "LEAD-001",          // Required
  quotationId: "QUO-001",      // Optional
  customerName: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
  packageName: "Tour Package",
  amount: 1000,
  tax: 10,
  discount: 5,
  total: 1050,
  status: "draft",             // see INVOICE_STATUS
  dueDate: "2025-11-15",
  issuedDate: "2025-10-30",
  paymentDate: null,
  paidAmount: 0,
  items: [...],
  notes: ""
}
```

### Payment Receipt
```javascript
{
  id: "REC-001",
  leadId: "LEAD-001",               // Required
  invoiceId: "INV-001",             // Required
  customerName: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
  amount: 500,
  paymentMethod: "Credit Card",     // see PAYMENT_METHODS
  paymentDate: "2025-10-30",
  status: "paid-in-advance",        // Auto-calculated
  transactionId: "TXN-123",
  invoiceTotal: 1050,               // From invoice
  previousPayments: 0,              // Calculated
  remainingBalance: 550,            // Auto-calculated
  notes: "",
  issuedDate: "2025-10-30"
}
```

## 🎯 Status Values

### Quotation Status
```javascript
QUOTATION_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
}
```

### Invoice Status
```javascript
INVOICE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  PARTIAL: 'partial',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled'
}
```

### Receipt Status
```javascript
RECEIPT_STATUS = {
  PAID_IN_ADVANCE: 'paid-in-advance',
  PAID_IN_FULL: 'paid-in-full'
}
```

## 🔧 Common Functions

### Generate ID
```javascript
const generateId = (prefix, count) => {
  return `${prefix}-${String(count + 1).padStart(3, '0')}`;
};

// Usage
const newQuotationId = generateId('QUO', quotations.length);
const newInvoiceId = generateId('INV', invoices.length);
const newReceiptId = generateId('REC', receipts.length);
```

### Calculate Totals
```javascript
const calculateTotals = (items, tax, discount) => {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = (subtotal * tax) / 100;
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal + taxAmount - discountAmount;
  
  return { subtotal, taxAmount, discountAmount, total };
};
```

### Determine Receipt Status
```javascript
const determineReceiptStatus = (paymentAmount, invoiceTotal, previousPayments) => {
  const totalPaid = paymentAmount + previousPayments;
  return totalPaid >= invoiceTotal ? 'paid-in-full' : 'paid-in-advance';
};
```

### Filter by Search Term
```javascript
const filterData = (data, searchTerm) => {
  return data.filter(item =>
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.leadName || item.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.leadId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
};
```

## 🎨 Status Colors

### Color Classes
```javascript
const statusColors = {
  quotations: {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    expired: 'bg-orange-100 text-orange-800'
  },
  invoices: {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    partial: 'bg-yellow-100 text-yellow-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800'
  },
  receipts: {
    'paid-in-advance': 'bg-blue-100 text-blue-800',
    'paid-in-full': 'bg-green-100 text-green-800'
  }
};
```

## 🔌 API Integration Points

### Fetch Leads
```javascript
const fetchLeads = async () => {
  const response = await leadAPI.getAllLeads({ limit: 1000 });
  if (response.success) {
    setLeads(response.data);
  }
};
```

### Save Quotation (Future)
```javascript
const saveQuotation = async (quotation) => {
  const response = await fetch('/api/quotations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quotation)
  });
  return response.json();
};
```

### Save Invoice (Future)
```javascript
const saveInvoice = async (invoice) => {
  const response = await fetch('/api/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice)
  });
  return response.json();
};
```

### Save Receipt (Future)
```javascript
const saveReceipt = async (receipt) => {
  const response = await fetch('/api/receipts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(receipt)
  });
  return response.json();
};
```

## 🐛 Common Issues

### Issue: Leads not loading
```javascript
// Check leadAPI is working
console.log('Leads:', leads);

// Ensure leads have required fields
leads.forEach(lead => {
  if (!lead.id || !lead.name || !lead.email) {
    console.error('Invalid lead:', lead);
  }
});
```

### Issue: Calculations wrong
```javascript
// Check item amounts
items.forEach(item => {
  const expectedAmount = item.quantity * item.rate;
  if (item.amount !== expectedAmount) {
    console.error('Amount mismatch:', item);
  }
});

// Check totals
const { total } = calculateTotals(items, tax, discount);
if (formData.total !== total) {
  console.error('Total mismatch:', { formData: formData.total, calculated: total });
}
```

### Issue: Status not updating
```javascript
// Check invoice update logic
const updateInvoiceStatus = (invoice, newPayment) => {
  const totalPaid = (invoice.paidAmount || 0) + newPayment;
  const newStatus = totalPaid >= invoice.total ? 'paid' : 'partial';
  
  console.log('Updating status:', {
    invoiceId: invoice.id,
    totalPaid,
    invoiceTotal: invoice.total,
    newStatus
  });
  
  return { ...invoice, paidAmount: totalPaid, status: newStatus };
};
```

## 📚 Documentation Links

- **Full Documentation**: `ENHANCED_BILLING_README.md`
- **Quick Start**: `QUICK_START_GUIDE.md`
- **Implementation**: `IMPLEMENTATION_SUMMARY.md`
- **Deployment**: `DEPLOYMENT_CHECKLIST.md`
- **Architecture**: `VISUAL_ARCHITECTURE.md`
- **This Reference**: `DEVELOPER_QUICK_REFERENCE.md`

## 💡 Pro Tips

1. **Always link to Lead ID** - It's required for all documents
2. **Use form validation** - Check required fields before save
3. **Calculate on change** - Update totals when items change
4. **Show feedback** - Use confirmations and messages
5. **Test calculations** - Verify math is correct
6. **Handle errors** - Use try-catch for API calls
7. **Optimize renders** - Use React.memo for tables
8. **Document changes** - Add comments for complex logic

## 🎯 Testing Checklist

- [ ] Can create quotation with lead
- [ ] Calculations are accurate
- [ ] Can convert quotation to invoice
- [ ] Can create invoice directly
- [ ] Can record payment receipt
- [ ] Status updates correctly
- [ ] Search works
- [ ] Filters work
- [ ] Forms validate
- [ ] Data persists

## 🚀 Next Steps

1. Add to routing
2. Test locally
3. Connect to backend API
4. Add PDF generation
5. Add email sending
6. Deploy to staging
7. User testing
8. Deploy to production

---

**Quick help**: Check `QUICK_START_GUIDE.md` for step-by-step walkthrough

*Last Updated: October 30, 2025*
