# Billing Feature Architecture

## Overview

The billing feature is organized following a modular, scalable architecture that separates concerns and promotes code reusability.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Pages Layer                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         BillingInvoicing.jsx (Page Component)         │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Features Layer                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            billing/ (Feature Module)                 │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │         Components (UI Layer)                  │  │   │
│  │  │  • PageHeader                                  │  │   │
│  │  │  • InvoiceStats                                │  │   │
│  │  │  • SearchBar                                   │  │   │
│  │  │  • StatusFilter                                │  │   │
│  │  │  • InvoiceTable                                │  │   │
│  │  │  • InvoiceDetailsModal                         │  │   │
│  │  │  • InvoiceForm (form/)                        │  │   │
│  │  │  • InvoiceItemsList (form/)                   │  │   │
│  │  │  • InvoiceFormModal (modal/)                  │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │         Hooks (State Management)               │  │   │
│  │  │  • useInvoiceState                             │  │   │
│  │  │  • useInvoiceForm                              │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │         Services (External)                    │  │   │
│  │  │  • pdfService                                  │  │   │
│  │  │  • emailService                                │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │         Utils (Business Logic)                 │  │   │
│  │  │  • helpers (calculations, filters)             │  │   │
│  │  │  • constants (configs, templates)              │  │   │
│  │  │  • sampleData (mock data)                      │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │         Types (Type Definitions)               │  │   │
│  │  │  • Invoice types                               │  │   │
│  │  │  • Status enums                                │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### 1. Pages Layer
**Responsibility**: Top-level page components that compose features together.

- Entry point for routes
- Coordinates feature modules
- Handles page-level state and side effects
- Minimal business logic

**Example**: `BillingInvoicing.jsx`
```javascript
- Imports feature components
- Manages page-level state with hooks
- Coordinates component interactions
- Handles user actions and callbacks
```

### 2. Components Layer
**Responsibility**: Reusable, presentational UI components.

#### Main Components
- Stateless, receive data via props
- Focus on rendering UI
- Emit events to parent components
- Highly reusable

#### Form Components (`form/`)
- Handle form input and validation
- Manage local form state
- Emit form data on submit

#### Modal Components (`modal/`)
- Wrap content in modal dialogs
- Handle open/close state
- Provide consistent modal styling

### 3. Hooks Layer
**Responsibility**: Custom hooks for state management and side effects.

#### `useInvoiceState`
- Manages invoice collection state
- Handles CRUD operations
- Manages UI state (modals, selections)
- Returns state and action methods

#### `useInvoiceForm`
- Manages form state
- Auto-calculates totals
- Handles form validation
- Syncs with parent component

### 4. Services Layer
**Responsibility**: External integrations and side effects.

#### `pdfService`
- Generates PDF documents
- Handles PDF styling and layout
- Manages file downloads

#### `emailService`
- Sends emails (placeholder)
- Will integrate with email API
- Handles email templates

### 5. Utils Layer
**Responsibility**: Helper functions and business logic.

#### `helpers.js`
- Pure functions for calculations
- Data transformation utilities
- Filter and search logic
- Validation functions

#### `constants.js`
- Configuration constants
- Default templates
- Color schemes
- Status options

#### `sampleData.js`
- Mock data for development
- Test fixtures
- Demo content

### 6. Types Layer
**Responsibility**: Type definitions and interfaces.

- TypeScript types (if using TS)
- JSDoc type annotations
- Enum definitions
- Constants for type safety

## Data Flow

### Read Flow (Data Down)
```
State (useInvoiceState)
    ↓
Computed Data (helpers)
    ↓
Props
    ↓
Components
    ↓
UI Render
```

### Write Flow (Events Up)
```
User Action
    ↓
Event Handler (Component)
    ↓
Callback Prop
    ↓
State Update (useInvoiceState)
    ↓
Re-render
```

### Side Effects Flow
```
User Action
    ↓
Event Handler
    ↓
Service Call (pdfService, emailService)
    ↓
External Operation
    ↓
User Feedback (Swal)
```

## Design Principles

### 1. Separation of Concerns
Each layer has a distinct responsibility. UI components don't contain business logic, and services don't manage state.

### 2. Single Responsibility
Each module, component, or function does one thing well.

### 3. Composition over Inheritance
Components are composed together rather than extended through inheritance.

### 4. DRY (Don't Repeat Yourself)
Common logic is extracted into reusable hooks and utilities.

### 5. Immutability
State is never mutated directly; new objects are created instead.

### 6. Prop Drilling Prevention
- State is lifted to the highest common ancestor
- For deeply nested components, Context API can be added

## Component Communication

### Parent-Child Communication
```javascript
// Parent passes data and callbacks
<InvoiceTable 
  invoices={invoices}
  onEdit={handleEdit}
/>

// Child emits events
const InvoiceTable = ({ invoices, onEdit }) => {
  return <button onClick={() => onEdit(invoice)}>Edit</button>
}
```

### Sibling Communication
Siblings communicate through shared parent state:
```javascript
<SearchBar value={search} onChange={setSearch} />
<InvoiceTable invoices={filtered} />
```

### Global Communication
For global state, consider:
- Context API
- Redux/Zustand
- React Query (for server state)

## State Management Strategy

### Local State
Managed with `useState` in individual components for UI-only state.

### Feature State
Managed with custom hooks (`useInvoiceState`, `useInvoiceForm`).

### Server State
Will be managed with React Query or SWR for API data fetching and caching.

### Global State
Context API or state management library for app-wide state.

## File Naming Conventions

- **Components**: PascalCase (e.g., `InvoiceTable.jsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useInvoiceState.js`)
- **Services**: camelCase with `Service` suffix (e.g., `pdfService.js`)
- **Utils**: camelCase (e.g., `helpers.js`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `STATUS_COLORS`)
- **Types**: PascalCase (e.g., `InvoiceStatus`)

## Import/Export Strategy

### Named Exports (Preferred)
```javascript
// Export
export const InvoiceTable = () => { ... }

// Import
import { InvoiceTable } from './components'
```

### Barrel Exports
```javascript
// components/index.js
export { InvoiceTable } from './InvoiceTable'
export { InvoiceStats } from './InvoiceStats'

// Usage
import { InvoiceTable, InvoiceStats } from './components'
```

## Testing Strategy

### Unit Tests
- Test helper functions in isolation
- Test custom hooks with `@testing-library/react-hooks`
- Test service functions with mocked dependencies

### Component Tests
- Test components in isolation with `@testing-library/react`
- Mock props and callbacks
- Test user interactions and rendering

### Integration Tests
- Test feature modules as a whole
- Test component interactions
- Test data flow

### E2E Tests
- Test complete user workflows with Cypress/Playwright
- Test across different pages
- Test real-world scenarios

## Performance Considerations

### Optimization Techniques
1. **Memoization**: Use `React.memo()` for expensive components
2. **useMemo**: Memoize expensive calculations
3. **useCallback**: Memoize callbacks to prevent re-renders
4. **Code Splitting**: Lazy load modal components
5. **Virtual Scrolling**: For large invoice lists
6. **Debouncing**: For search input

### Example
```javascript
const filteredInvoices = useMemo(
  () => filterInvoices(invoices, search, status),
  [invoices, search, status]
)

const handleEdit = useCallback(
  (invoice) => openEditModal(invoice),
  [openEditModal]
)
```

## Scalability Considerations

### Adding New Features
1. Create new components in `components/`
2. Add business logic to `utils/helpers.js`
3. Create custom hooks if needed
4. Add service integrations in `services/`
5. Update types and constants

### Code Organization
- Keep files small (< 300 lines)
- Extract complex logic into separate functions
- Create subdirectories when a folder has > 10 files
- Group related components together

### API Integration
When adding API integration:
1. Create `apiService.js` in `services/`
2. Use React Query for data fetching
3. Create API hooks (`useInvoices`, `useCreateInvoice`)
4. Handle loading, error, and success states

## Comparison with Itinerary Feature

### Similarities
✅ Feature-based folder structure
✅ Separation of components, hooks, services
✅ Custom hooks for state management
✅ Utility functions for business logic
✅ Barrel exports for clean imports

### Differences
- Billing has modal-specific folder (`modal/`)
- Billing has separate services (PDF, email)
- Different domain-specific logic and types
- Invoice-specific validation and calculations

## Migration Guide

To use the new structure:

1. **Update imports in your routing file**:
```javascript
// Old
import BillingInvoicing from './pages/BillingInvoicing'

// New
import BillingInvoicing from './pages/BillingInvoicing_New'
```

2. **Backup the old file** (optional):
```javascript
// Rename BillingInvoicing.jsx to BillingInvoicing_Old.jsx
```

3. **Replace with new version**:
```javascript
// Rename BillingInvoicing_New.jsx to BillingInvoicing.jsx
```

4. **Test thoroughly**:
- Test all CRUD operations
- Test filtering and searching
- Test PDF generation
- Test email sending
- Test modal interactions

## Future Improvements

### Short Term
- [ ] Add TypeScript for better type safety
- [ ] Add PropTypes validation
- [ ] Add loading states
- [ ] Add error boundaries
- [ ] Improve accessibility

### Medium Term
- [ ] Add Context API for global state
- [ ] Integrate with backend API
- [ ] Add React Query for server state
- [ ] Add form validation library (e.g., Yup)
- [ ] Add unit and integration tests

### Long Term
- [ ] Add invoice templates
- [ ] Add bulk operations
- [ ] Add advanced filtering
- [ ] Add data export (Excel, CSV)
- [ ] Add real-time updates with WebSocket
- [ ] Add invoice versioning and audit logs

## Resources

- [React Documentation](https://react.dev)
- [Thinking in React](https://react.dev/learn/thinking-in-react)
- [Component Patterns](https://www.patterns.dev/posts/react-patterns)
- [Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
