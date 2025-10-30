# Billing & Invoicing Feature

A well-organized, maintainable billing and invoicing feature built with React following industry best practices.

## 📁 Directory Structure

```
billing/
├── components/          # Reusable UI components
│   ├── form/           # Form-related components
│   │   ├── InvoiceForm.jsx
│   │   └── InvoiceItemsList.jsx
│   ├── modal/          # Modal components
│   │   └── InvoiceFormModal.jsx
│   ├── InvoiceDetailsModal.jsx
│   ├── InvoiceStats.jsx
│   ├── InvoiceTable.jsx
│   ├── PageHeader.jsx
│   ├── SearchBar.jsx
│   ├── StatusFilter.jsx
│   └── index.js        # Component exports
├── hooks/              # Custom React hooks
│   ├── useInvoiceForm.js
│   ├── useInvoiceState.js
│   └── index.js
├── services/           # External service integrations
│   ├── emailService.js
│   ├── pdfService.js
│   └── index.js
├── types/              # Type definitions and constants
│   └── index.js
├── utils/              # Helper functions and utilities
│   ├── constants.js
│   ├── helpers.js
│   ├── sampleData.js
│   └── index.js
└── index.js            # Main feature exports
```

## 🧩 Components

### Core Components

- **PageHeader**: Header with title and action buttons
- **InvoiceStats**: Statistics dashboard showing revenue, paid invoices, etc.
- **SearchBar**: Search functionality for filtering invoices
- **StatusFilter**: Status-based filtering tabs
- **InvoiceTable**: Main table displaying all invoices
- **InvoiceDetailsModal**: Detailed view of a single invoice

### Form Components

- **InvoiceForm**: Main form for creating/editing invoices
- **InvoiceItemsList**: Line items manager for invoice items
- **InvoiceFormModal**: Modal wrapper for invoice forms

## 🪝 Custom Hooks

### useInvoiceState

Manages the state of invoices and UI interactions.

```javascript
const {
  invoices,
  searchTerm,
  filterStatus,
  selectedInvoice,
  showNewInvoiceDialog,
  showEditInvoiceDialog,
  addInvoice,
  updateInvoice,
  openNewInvoiceDialog,
  // ... more
} = useInvoiceState(initialInvoices);
```

### useInvoiceForm

Manages form state and validation for invoice creation/editing.

```javascript
const {
  localData,
  handleInputChange,
  handleTaxChange,
  addItem,
  removeItem,
  updateItem,
  // ... more
} = useInvoiceForm(initialData);
```

## 🛠️ Services

### pdfService

Handles PDF generation for invoices.

```javascript
import { generateInvoicePDF } from "../services/pdfService";
generateInvoicePDF(invoice);
```

### emailService

Handles email functionality for invoices.

```javascript
import { sendInvoiceEmail } from "../services/emailService";
sendInvoiceEmail(invoice);
```

## 📦 Utils

### Helper Functions

- `computeInvoices()` - Calculate overdue invoices
- `calculateTotalRevenue()` - Sum total revenue
- `calculatePendingAmount()` - Sum pending payments
- `filterInvoices()` - Filter by search and status
- `generateInvoiceId()` - Generate next invoice ID
- `calculateInvoiceStats()` - Calculate statistics
- `validateInvoiceForm()` - Validate form data

### Constants

- `STATUS_COLORS` - Color schemes for invoice statuses
- `FILTER_STATUS_OPTIONS` - Available filter options
- `DEFAULT_INVOICE_TEMPLATE` - Default invoice structure
- `DEFAULT_INVOICE_ITEM` - Default item structure

## 🎯 Usage

### Import the refactored page

```javascript
import BillingInvoicing from "./pages/BillingInvoicing_New";
```

### Using individual components

```javascript
import {
  InvoiceTable,
  InvoiceStats,
  SearchBar,
} from "../features/billing/components";
import { useInvoiceState } from "../features/billing/hooks";
import { generateInvoicePDF } from "../features/billing/services";
```

## 🔄 Data Flow

1. **State Management**: `useInvoiceState` hook manages all invoice data
2. **Computed Data**: Invoices are processed (overdue calculation, filtering)
3. **UI Components**: Components receive data via props
4. **User Actions**: Events trigger callbacks that update state
5. **Side Effects**: Services handle external operations (PDF, email)

## 🎨 Design Patterns

### Component Composition

Components are small, focused, and composable. Each component has a single responsibility.

### Custom Hooks

Business logic is extracted into reusable hooks, separating concerns from UI.

### Service Layer

External integrations (PDF, email) are isolated in service modules.

### Props Drilling Prevention

State is managed at the top level and passed down through props. For larger applications, consider adding Context API or state management library.

## 🧪 Testing Strategy

- **Unit Tests**: Test helper functions and utilities
- **Component Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user flows

## 🚀 Future Enhancements

- [ ] Add Context API for global state management
- [ ] Implement actual API integration
- [ ] Add invoice templates
- [ ] Add bulk operations
- [ ] Implement invoice history/audit log
- [ ] Add export to Excel functionality
- [ ] Implement real-time collaboration
- [ ] Add invoice reminders and notifications

## 📝 Best Practices

1. **Separation of Concerns**: Each module has a specific purpose
2. **DRY Principle**: Reusable components and utilities
3. **Single Responsibility**: Each component/function does one thing well
4. **Prop Types**: Use TypeScript or PropTypes for type safety
5. **Error Handling**: Proper error boundaries and validation
6. **Performance**: Memoization and lazy loading where needed
7. **Accessibility**: ARIA labels and keyboard navigation
8. **Documentation**: JSDoc comments for functions and components

## 🔗 Related Documentation

- [React Best Practices](https://react.dev/learn)
- [Component Design Patterns](https://www.patterns.dev/posts/react-patterns)
- [Custom Hooks Guide](https://react.dev/learn/reusing-logic-with-custom-hooks)
