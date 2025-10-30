# Industry-Standard Quotation System Documentation

## 📋 Overview

The enhanced quotation system is a professional, user-friendly platform for creating, managing, and tracking travel quotations. It follows industry best practices and integrates seamlessly with packages, pricing, and customer information.

## ✨ Key Features

### 1. **Smart Package Integration**
- **Package Selection**: Choose from existing travel packages with pre-populated pricing
- **Auto-Population**: Package details (destination, duration, price) automatically fill in
- **Flexible Options**: Add custom services/items on top of base package pricing
- **Package-Based Quotations**: Industry-standard structure for travel businesses

### 2. **Professional Service Breakdown**
Organize quotations by service categories:
- 🏨 **Accommodation**: Hotel, resort, airbnb bookings
- 🚗 **Transportation**: Flights, car rentals, buses
- 🎯 **Activities**: Tours, adventure activities, experiences
- 🍽️ **Food & Beverages**: Meal plans, special dining
- 👨‍💼 **Tour Guide**: Professional guide services
- 🛡️ **Insurance**: Travel insurance options
- 📝 **Visa**: Visa processing fees
- 📌 **Other**: Miscellaneous charges

### 3. **Dynamic Pricing Calculator**
Automatically calculates:
- **Subtotal**: Sum of all services
- **Discounts**: Percentage or fixed amount
- **Service Charge**: Additional platform/service fees
- **Tax**: GST or local tax rates
- **Final Total**: All amounts combined

### 4. **Customer & Lead Management**
- Select from existing leads with full contact info
- Auto-populate customer details (email, phone, address, GST number)
- Lead search with name, ID, and email filtering
- Maintain complete customer audit trail

### 5. **Terms & Conditions**
- **Payment Terms**: Net 30, Net 15, Due on Receipt, Deposit-based options
- **Custom Terms**: Add specific conditions and policies
- **Validity Period**: Set quotation expiration dates
- **Internal Notes**: Non-visible notes for team coordination

## 🎯 User Interface Walkthrough

### Step 1: Customer & Lead Selection
```
1. Search for customer lead
2. Select from dropdown
3. Confirm customer details are correct
4. System auto-fills contact information
```

**Pro Tip**: Search by name, ID, or email for quick access to regular customers.

### Step 2: Package Selection (Optional but Recommended)
```
1. Search available packages by name or destination
2. Click package to select
3. Base price auto-populates into quotation
4. Package details displayed for reference
```

**Industry Best Practice**: Using standard packages maintains pricing consistency and speeds up quote creation.

### Step 3: Services & Add-ons
```
1. Click "Add Service" button
2. Select service category from dropdown
3. Enter quantity and unit price
4. System calculates line total automatically
5. Add notes for specific requirements
6. Add multiple services as needed
7. Remove services with trash icon
```

**Features**:
- Inline editing of quantities, prices
- Service categorization
- Optional notes per service
- Real-time calculation

### Step 4: Pricing Settings
```
1. Set tax rate (e.g., 10% GST)
2. Choose discount type (%, fixed, or none)
3. Enter discount amount
4. Add service charges if applicable
5. Set quotation validity period
```

**Pricing Breakdown View**:
Shows real-time calculation of:
- Subtotal
- All discounts
- Service charges
- Tax amount
- **Final Total**

### Step 5: Terms & Conditions
```
1. Select payment terms from dropdown
2. Add custom terms and conditions
3. Include cancellation policy
4. Set quotation status (Draft/Sent)
5. Add internal notes for team
```

## 💰 Pricing Calculation Examples

### Example 1: Standard Package + Activities
```
Package: "Swiss Alps Adventure" - $2,500
Additional Services:
  - Extra guide (2 days × $100) = $200
  - Adventure insurance = $150
  
Subtotal: $2,850
Tax (10%): $285
Discount (5%): -$142.50
TOTAL: $2,992.50
```

### Example 2: Custom Multi-Service Quote
```
Accommodation (5 nights × $150) = $750
Flights (2 × $400) = $800
Activities (3 × $120) = $360
Tour Guide (5 days × $80) = $400
Meals (10 × $30) = $300

Subtotal: $2,610
Service Charge (5%): $130.50
Tax (10%): $274.05
Discount (Corporate 10%): -$261
TOTAL: $2,753.55
```

## 🚀 Best Practices

### 1. **Always Include Quotation Number**
- Auto-generated in format: QT-YYYYMM-00001
- Helps track and reference quotations

### 2. **Set Appropriate Validity Periods**
- Standard: 30 days
- Urgent: 7-14 days
- Long-term: 60+ days (rare)

### 3. **Use Standardized Service Categories**
- Consistency in quotations
- Easier to track revenue by category
- Better reporting and analysis

### 4. **Include Detailed Terms**
- Cancellation policy
- Payment schedule (if deposit-based)
- Inclusions and exclusions
- Special conditions

### 5. **Keep Internal Notes**
- Mark if customer is repeat client
- Note any special requirements
- Record discounts and reasons
- Track communication history

## 📊 Quotation Statuses

| Status | Meaning | Action |
|--------|---------|--------|
| **Draft** | Quotation created but not sent | Edit freely, add details |
| **Sent** | Quotation sent to customer | Awaiting customer response |
| **Viewed** | Customer has viewed quotation | Follow-up recommended |
| **Accepted** | Customer accepted quotation | Ready to convert to invoice |
| **Rejected** | Customer declined quotation | Document reason, follow-up |
| **Expired** | Validity period passed | Renew or archive |
| **Converted** | Converted to invoice | Quotation fulfilled |

## 🔄 Quotation Workflow

```
CREATE DRAFT
    ↓
  ADD SERVICES
    ↓
  REVIEW PRICING
    ↓
SET TERMS & PAYMENT
    ↓
SEND TO CUSTOMER
    ↓
WAIT FOR RESPONSE
    ├─ ACCEPTED ─→ CONVERT TO INVOICE
    ├─ REJECTED ─→ FOLLOW-UP
    └─ NO RESPONSE ─→ REMINDER
```

## 🎨 User Experience Features

### 1. **Color-Coded Sections**
- 🔵 **Blue**: Customer & Lead info
- 🟢 **Green**: Package selection
- 🟣 **Purple**: Services & items
- 🔵 **Blue**: Pricing summary
- 🟡 **Yellow**: Additional settings

### 2. **Real-Time Feedback**
- Checkmarks for completed sections
- Invalid inputs highlighted
- Calculations updated instantly
- Helpful error messages

### 3. **Mobile-Responsive Design**
- Forms adapt to screen size
- Touch-friendly buttons
- Readable on tablets
- Optimal for mobile use

## 📝 Data Fields Explained

### Customer Information
- **Lead ID**: Unique identifier for customer
- **Name**: Customer full name
- **Email**: For quotation delivery
- **Phone**: For follow-up
- **Address**: For billing
- **GST Number**: For business quotations

### Service Details
- **Category**: Type of service for tracking
- **Description**: Clear service description
- **Quantity**: Number of units/days
- **Unit Price**: Cost per unit
- **Total Price**: Auto-calculated (Qty × Unit Price)
- **Notes**: Additional specifications

### Pricing Options
- **Tax Rate**: Local/national tax percentage
- **Discount Type**: Percentage or fixed amount
- **Service Charge**: Platform or handling fees
- **Payment Terms**: Due date terms

## 🔗 Integration Points

### Packages API Integration
```javascript
// Fetch packages for selection dropdown
GET /api/packages
- Returns: Package name, destination, duration, price, description

// Use package data to auto-populate quotation
- Base price added as first line item
- Duration and destination added to quotation info
```

### Leads API Integration
```javascript
// Fetch leads for customer selection
GET /api/leads
- Returns: Lead ID, name, email, phone, address, GST number

// Auto-populate customer information
- All contact details filled in
- Maintains data consistency
```

### Invoicing Integration
```javascript
// Convert accepted quotation to invoice
- All items, pricing preserved
- Customer details transferred
- Quotation reference added to invoice
- Tax and discounts maintained
```

## 🛠️ Technical Implementation

### Component Structure
```
EnhancedBillingInvoicing (Main Page)
├── TabNavigation (Quotations, Invoices, Receipts)
├── SearchBar & StatusFilter
├── QuotationsTable (List view)
└── EnhancedQuotationForm (Modal)
    ├── Lead Selection Dropdown
    ├── Package Selection Dropdown
    ├── Service Form
    ├── Pricing Calculator
    └── Terms & Conditions
```

### State Management
```javascript
{
  id: null,
  leadId: '',
  customerName: '',
  email: '',
  phone: '',
  packageId: '',
  items: [],
  subtotal: 0,
  taxRate: 10,
  taxAmount: 0,
  discountType: 'none',
  discountValue: 0,
  serviceChargeRate: 0,
  total: 0,
  status: 'draft',
  validUntil: '',
  paymentTerms: 'net-30',
  terms: '',
  notes: ''
}
```

## 📱 Navigation Tips

### Creating a New Quotation
1. Click **"New Quotation"** button in top right
2. **Step 1**: Select customer from lead dropdown
3. **Step 2**: Search and select travel package
4. **Step 3**: Add additional services if needed
5. **Step 4**: Review pricing breakdown
6. **Step 5**: Set payment terms and conditions
7. Click **"Create Quotation"** to save

### Editing Existing Quotation
1. Find quotation in list
2. Click **edit icon** (pencil)
3. Make changes (before sending to customer)
4. Click **"Update Quotation"** to save

### Converting to Invoice
1. Select **"Accepted"** quotation from list
2. Click **"Convert to Invoice"** button
3. New invoice created with quotation details
4. Make any invoice-specific adjustments
5. Send to customer or process payment

## 🎓 Training Checklist

- [ ] Understand quotation statuses
- [ ] Practice creating draft quotations
- [ ] Master package selection
- [ ] Practice service categorization
- [ ] Understand pricing calculations
- [ ] Learn payment terms options
- [ ] Practice converting to invoices
- [ ] Understand internal notes usage
- [ ] Learn search and filter features
- [ ] Practice on 5+ sample quotations

## 🆘 Common Issues & Solutions

### Issue: "Cannot find customer lead"
**Solution**: 
- Use exact name or ID number
- Check if lead exists in system
- Ask admin to create lead if missing

### Issue: "Pricing not calculating correctly"
**Solution**:
- Verify tax rate is set
- Check discount is positive
- Ensure all quantities are entered
- Contact support if issue persists

### Issue: "Cannot convert quotation to invoice"
**Solution**:
- Quotation must be in "Accepted" status
- Fill in all required fields
- Check if invoice already exists
- Try refreshing page

## 📞 Support

For issues or questions:
- Contact: support@tripsky way.com
- Hours: 9 AM - 6 PM (Business Days)
- Response Time: 2-4 hours

---

**Last Updated**: October 2025  
**Version**: 1.0  
**Status**: Production Ready ✅
