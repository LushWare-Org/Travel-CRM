# Billing Feature - Quick Reference Guide

## 📚 Table of Contents
- [Quick Start](#quick-start)
- [Component Reference](#component-reference)
- [Hook Reference](#hook-reference)
- [Utility Reference](#utility-reference)
- [Common Tasks](#common-tasks)

## 🚀 Quick Start

### Import and Use the Page
```javascript
import BillingInvoicing from './pages/BillingInvoicing_New';

// In your router
<Route path="/billing" component={BillingInvoicing} />
```

### Use Individual Components
```javascript
import {
  InvoiceTable,
  InvoiceStats,
  SearchBar,
  StatusFilter,
} from '../features/billing/components';

// Use in your component
<InvoiceStats stats={stats} />
<SearchBar searchTerm={term} onSearchChange={setTerm} />
<InvoiceTable invoices={invoices} onEdit={handleEdit} />
```

## 📦 Component Reference

### PageHeader
```javascript
<PageHeader onNewInvoice={handleNewInvoice} />
```
**Props:**
- `onNewInvoice` (function): Callback when "New Invoice" button is clicked

### InvoiceStats
```javascript
<InvoiceStats stats={{
  totalRevenue: 10000,
  paidCount: 5,
  pendingAmount: 2000,
  overdueCount: 1
}} />
```
**Props:**
- `stats` (object): Statistics object with revenue and counts

### SearchBar
```javascript
<SearchBar 
  searchTerm={searchTerm} 
  onSearchChange={(term) => setSearchTerm(term)} 
/>
```
**Props:**
- `searchTerm` (string): Current search term
- `onSearchChange` (function): Callback when search changes

### StatusFilter
```javascript
<StatusFilter 
  filterStatus={status}
  onFilterChange={(newStatus) => setStatus(newStatus)}
  invoices={invoices}
/>
```
**Props:**
- `filterStatus` (string): Current filter status
- `onFilterChange` (function): Callback when filter changes
- `invoices` (array): All invoices for counting

### InvoiceTable
```javascript
<InvoiceTable 
  invoices={invoices}
  onView={(invoice) => console.log(invoice)}
  onEdit={(invoice) => console.log(invoice)}
  onDownload={(invoice) => generatePDF(invoice)}
  onSend={(invoice) => sendEmail(invoice)}
/>
```
**Props:**
- `invoices` (array): Array of invoice objects
- `onView` (function): Callback when view button clicked
- `onEdit` (function): Callback when edit button clicked
- `onDownload` (function): Callback when download button clicked
- `onSend` (function): Callback when send button clicked

### InvoiceDetailsModal
```javascript
<InvoiceDetailsModal 
  invoice={selectedInvoice}
  onClose={() => setSelectedInvoice(null)}
  onDownload={handleDownload}
  onSend={handleSend}
/>
```
**Props:**
- `invoice` (object|null): Invoice to display (null to hide modal)
- `onClose` (function): Callback to close modal
- `onDownload` (function): Callback to download invoice
- `onSend` (function): Callback to send invoice

### InvoiceFormModal
```javascript
<InvoiceFormModal 
  isOpen={showModal}
  title="Create New Invoice"
  description="Generate an invoice for a booking"
  formData={invoiceData}
  onSave={(data) => saveInvoice(data)}
  onCancel={() => setShowModal(false)}
  today="2025-10-30"
/>
```
**Props:**
- `isOpen` (boolean): Modal visibility
- `title` (string): Modal title
- `description` (string): Modal description
- `formData` (object): Invoice form data
- `onSave` (function): Callback when form is saved
- `onCancel` (function): Callback when form is cancelled
- `today` (string): Current date (YYYY-MM-DD)

### InvoiceForm
```javascript
<InvoiceForm 
  formData={invoiceData}
  onSave={(data) => saveInvoice(data)}
  onCancel={() => closeForm()}
  today="2025-10-30"
/>
```
**Props:**
- Same as InvoiceFormModal (used internally by modal)

### InvoiceItemsList
```javascript
<InvoiceItemsList 
  items={items}
  onAdd={() => addNewItem()}
  onRemove={(index) => removeItem(index)}
  onUpdate={(index, field, value) => updateItem(index, field, value)}
/>
```
**Props:**
- `items` (array): Array of invoice items
- `onAdd` (function): Callback to add new item
- `onRemove` (function): Callback to remove item by index
- `onUpdate` (function): Callback to update item field

## 🪝 Hook Reference

### useInvoiceState
```javascript
const {
  invoices,              // Array of invoices
  setInvoices,          // Set invoices directly
  searchTerm,           // Current search term
  setSearchTerm,        // Update search term
  filterStatus,         // Current filter status
  setFilterStatus,      // Update filter status
  selectedInvoice,      // Currently selected invoice
  setSelectedInvoice,   // Set selected invoice
  showNewInvoiceDialog, // New invoice modal visibility
  showEditInvoiceDialog,// Edit invoice modal visibility
  editInvoiceData,      // Data for invoice being edited
  setEditInvoiceData,   // Update edit data
  addInvoice,           // Add new invoice
  updateInvoice,        // Update existing invoice
  deleteInvoice,        // Delete invoice
  openNewInvoiceDialog, // Open new invoice modal
  closeNewInvoiceDialog,// Close new invoice modal
  openEditInvoiceDialog,// Open edit modal
  closeEditInvoiceDialog,// Close edit modal
  getNewInvoiceTemplate,// Get template for new invoice
} = useInvoiceState(initialInvoices);
```

### useInvoiceForm
```javascript
const {
  localData,             // Current form data
  setLocalData,          // Set form data directly
  handleInputChange,     // Handle text input changes
  handleTaxChange,       // Handle tax input
  handleStatusChange,    // Handle status change
  addItem,               // Add new item
  removeItem,            // Remove item by index
  updateItem,            // Update item field
  handlePaidAmountChange,// Handle paid amount change
  resetForm,             // Reset form to initial state
} = useInvoiceForm(initialData);
```

## 🛠️ Utility Reference

### Helper Functions

#### computeInvoices(invoices, currentDate)
```javascript
import { computeInvoices } from '../features/billing/utils';

const computed = computeInvoices(invoices, "2025-10-30");
// Returns invoices with overdue status calculated
```

#### calculateTotalRevenue(invoices)
```javascript
import { calculateTotalRevenue } from '../features/billing/utils';

const revenue = calculateTotalRevenue(invoices);
// Returns: 15000
```

#### calculatePendingAmount(invoices)
```javascript
import { calculatePendingAmount } from '../features/billing/utils';

const pending = calculatePendingAmount(invoices);
// Returns: 5000
```

#### filterInvoices(invoices, searchTerm, filterStatus)
```javascript
import { filterInvoices } from '../features/billing/utils';

const filtered = filterInvoices(invoices, "John", "paid");
// Returns filtered array
```

#### generateInvoiceId(invoices)
```javascript
import { generateInvoiceId } from '../features/billing/utils';

const newId = generateInvoiceId(invoices);
// Returns: "INV-004"
```

#### calculateInvoiceStats(invoices)
```javascript
import { calculateInvoiceStats } from '../features/billing/utils';

const stats = calculateInvoiceStats(invoices);
// Returns: { totalRevenue, paidCount, pendingAmount, overdueCount }
```

#### validateInvoiceForm(formData)
```javascript
import { validateInvoiceForm } from '../features/billing/utils';

const { isValid, errors } = validateInvoiceForm(formData);
if (!isValid) {
  console.log(errors); // { customerName: "Required", ... }
}
```

### Service Functions

#### generateInvoicePDF(invoice)
```javascript
import { generateInvoicePDF } from '../features/billing/services';

generateInvoicePDF(invoice);
// Downloads PDF file
```

#### sendInvoiceEmail(invoice)
```javascript
import { sendInvoiceEmail } from '../features/billing/services';

sendInvoiceEmail(invoice);
// Sends email (placeholder)
```

### Constants

#### STATUS_COLORS
```javascript
import { STATUS_COLORS } from '../features/billing/utils';

const color = STATUS_COLORS['paid'].badge;
// Returns: "bg-green-100 text-green-800"
```

#### DEFAULT_INVOICE_TEMPLATE
```javascript
import { DEFAULT_INVOICE_TEMPLATE } from '../features/billing/utils';

const newInvoice = { ...DEFAULT_INVOICE_TEMPLATE };
```

#### DEFAULT_INVOICE_ITEM
```javascript
import { DEFAULT_INVOICE_ITEM } from '../features/billing/utils';

const newItem = { ...DEFAULT_INVOICE_ITEM };
```

## 📝 Common Tasks

### Task 1: Create a New Invoice
```javascript
import { useInvoiceState } from '../features/billing/hooks';
import { DEFAULT_INVOICE_TEMPLATE } from '../features/billing/utils';
import Swal from 'sweetalert2';

const MyComponent = () => {
  const { addInvoice, getNewInvoiceTemplate } = useInvoiceState([]);
  
  const handleCreateInvoice = () => {
    const newInvoice = getNewInvoiceTemplate("2025-10-30");
    // ... populate invoice data
    addInvoice(newInvoice);
    Swal.fire("Success", "Invoice created!", "success");
  };
};
```

### Task 2: Edit an Invoice
```javascript
const { updateInvoice, openEditInvoiceDialog } = useInvoiceState();

const handleEdit = (invoice) => {
  openEditInvoiceDialog(invoice);
};

const handleSave = (updatedInvoice) => {
  updateInvoice(updatedInvoice);
  Swal.fire("Success", "Invoice updated!", "success");
};
```

### Task 3: Filter and Search Invoices
```javascript
import { filterInvoices, computeInvoices } from '../features/billing/utils';

const [searchTerm, setSearchTerm] = useState("");
const [filterStatus, setFilterStatus] = useState("all");

const computed = computeInvoices(invoices, today);
const filtered = filterInvoices(computed, searchTerm, filterStatus);
```

### Task 4: Calculate Statistics
```javascript
import { calculateInvoiceStats } from '../features/billing/utils';

const stats = calculateInvoiceStats(invoices);

<InvoiceStats stats={stats} />
```

### Task 5: Generate PDF
```javascript
import { generateInvoicePDF } from '../features/billing/services';

<button onClick={() => generateInvoicePDF(invoice)}>
  Download PDF
</button>
```

### Task 6: Custom Form Validation
```javascript
import { validateInvoiceForm } from '../features/billing/utils';

const handleSubmit = (formData) => {
  const { isValid, errors } = validateInvoiceForm(formData);
  
  if (!isValid) {
    Swal.fire("Error", Object.values(errors).join(", "), "error");
    return;
  }
  
  // Save invoice
  addInvoice(formData);
};
```

### Task 7: Add Custom Invoice Status
```javascript
// In utils/constants.js
export const STATUS_COLORS = {
  // ... existing statuses
  cancelled: { 
    bg: "bg-gray-50", 
    badge: "bg-gray-100 text-gray-800" 
  },
};

export const FILTER_STATUS_OPTIONS = [
  "all", "paid", "pending", "partial", "overdue", "cancelled"
];
```

### Task 8: Integrate with API
```javascript
// Create services/apiService.js
export const fetchInvoices = async () => {
  const response = await fetch('/api/invoices');
  return response.json();
};

export const createInvoice = async (invoice) => {
  const response = await fetch('/api/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  });
  return response.json();
};

// Use in component
import { fetchInvoices, createInvoice } from '../features/billing/services';

useEffect(() => {
  fetchInvoices().then(setInvoices);
}, []);
```

## 🎨 Styling Guide

### Tailwind Classes Used
- **Buttons**: `px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600`
- **Inputs**: `px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2`
- **Cards**: `bg-white rounded-lg border border-gray-200 shadow-sm`
- **Badges**: `px-3 py-1 rounded-full text-xs font-semibold`

### Custom Styling
To add custom styles, extend Tailwind config or use CSS modules.

## 🐛 Debugging Tips

### Check State
```javascript
console.log('Current invoices:', invoices);
console.log('Filtered invoices:', filteredInvoices);
console.log('Stats:', stats);
```

### Check Props
```javascript
const InvoiceTable = ({ invoices, onEdit }) => {
  console.log('Received invoices:', invoices);
  console.log('onEdit callback:', onEdit);
  // ...
};
```

### Use React DevTools
- Inspect component props and state
- Check component hierarchy
- Profile performance

## 📖 Additional Resources

- [Main README](./README.md)
- [Architecture Documentation](./ARCHITECTURE.md)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)

## 🤝 Contributing

When adding new features:
1. Follow the existing folder structure
2. Create components in `components/`
3. Add business logic to `utils/helpers.js`
4. Update this reference guide
5. Add JSDoc comments
6. Test thoroughly

## 📞 Support

For questions or issues, refer to the team documentation or create an issue in the project repository.
