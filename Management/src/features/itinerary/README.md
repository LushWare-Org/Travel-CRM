# Itinerary Feature Module

## Quick Start

### File Organization
The itinerary feature is organized following the feature-based folder structure:

```
src/features/itinerary/
├── components/          # UI Components
├── containers/          # Container/Smart Components
├── hooks/              # Custom React Hooks
├── services/           # Business Logic & API
├── types/              # Type Definitions
├── utils/              # Helper Functions
└── index.js            # Main Export
```

### How to Use

1. **Import the feature:**
```javascript
import { ItineraryGeneration } from '../features/itinerary';

// In your page/route
const ItineraryPage = () => <ItineraryGeneration />;
```

2. **Use individual components:**
```javascript
import { 
  PackageCard, 
  PackagesGrid, 
  SearchBar 
} from '../features/itinerary';
```

3. **Use custom hooks:**
```javascript
import { usePackageState, useImageUpload } from '../features/itinerary/hooks';

const MyComponent = () => {
  const { packages, addPackage } = usePackageState([]);
  const { images, handleUpload } = useImageUpload();
  // ...
};
```

## Component Directory

### Layout & Container
- `PageHeader` - Top header with title and action button
- `SearchBar` - Search input component
- `PackageStats` - Statistics display
- `PackagesGrid` - Grid layout wrapper
- `ItineraryGenerationContainer` - Main container (smart component)

### Package Management
- `PackageCard` - Individual package display card
- `PackageDetailsModal` - Detailed package view
- `PackageFormModal` - Reusable form modal wrapper

### Forms
- `NewEditPackageForm` - Main form component
- `BasicPackageInfo` - Basic package fields
- `PackageDetails` - Duration and pricing fields

### Itinerary
- `ItineraryEditor` - Editable itinerary form
- `ItineraryDisplay` - Read-only itinerary display

### Utilities
- `ImageUpload` - Image upload and preview

## Custom Hooks

| Hook | Purpose |
|------|---------|
| `usePackageState` | Manage package CRUD operations |
| `useItineraryForm` | Manage itinerary form state |
| `useImageUpload` | Handle image uploads |

## Services

| Service | Functions |
|---------|-----------|
| `pdfService` | `generateAndDownloadPDF(pkg)` |
| `imageService` | `uploadImage(file)`, `uploadMultipleImages(files, callback)` |

## Key Features

✅ Package Management (Create, Read, Update, Delete)
✅ Dynamic Itinerary Generation
✅ Image Upload to Cloud (imgbb)
✅ PDF Download of Itineraries
✅ Search & Filter Packages
✅ Draft & Publish Workflow
✅ Statistics Dashboard
✅ Responsive Design

## Configuration

### Constants
Located in `utils/constants.js`:
- `CATEGORY_COLORS` - Category badge colors
- `STATUS_COLORS` - Status badge colors
- `CATEGORY_OPTIONS` - Available categories
- `REGION_OPTIONS` - Available regions
- `IMAGE_UPLOAD_API_KEY` - imgbb API key
- `VALIDATION_MESSAGES` - User messages

### Sample Data
Located in `containers/sampleData.js`:
- 5 sample packages for development
- Complete package structure reference

## Common Tasks

### Add a new package
```javascript
const { addPackage } = usePackageState(packages);

addPackage({
  name: "New Package",
  category: "Adventure",
  // ... other fields
});
```

### Update package form
```javascript
const [formData, setFormData] = useState(initialPackage);

// Form components call setFormData
<BasicPackageInfo 
  formData={formData} 
  onChange={setFormData} 
/>
```

### Generate PDF
```javascript
import { generateAndDownloadPDF } from '../features/itinerary/services/pdfService';

generateAndDownloadPDF(packageObject);
```

### Upload images
```javascript
const { handleUpload } = useImageUpload();

const handleFileChange = (e) => {
  handleUpload(e.target.files);
};
```

## File Structure Best Practices

### When Adding New Components
1. Create in appropriate subdirectory (`components/`, `containers/`)
2. Add JSDoc comments at top
3. Export from `components/index.js` or `containers/index.js`
4. Update feature `index.js` if exporting publicly

### When Adding New Utilities
1. Place in `utils/` directory
2. Add JSDoc with parameters and return types
3. Keep functions pure and reusable
4. Export from appropriate utility file

### When Adding New Hooks
1. Create in `hooks/` directory
2. Prefix filename with "use"
3. Document props, state, and return values
4. Export from `hooks/index.js`

## Testing Guide

### Component Testing
Test components with different props combinations

### Hook Testing
Use `renderHook` from React Testing Library

### Service Testing
Mock API calls and test transformations

## Performance Optimization Tips

1. **Memoize expensive components:**
```javascript
const PackageCard = React.memo(({ pkg, ...props }) => (...));
```

2. **Use useCallback for handlers:**
```javascript
const handleDelete = useCallback((id) => { ... }, []);
```

3. **Lazy load components:**
```javascript
const ItineraryGeneration = lazy(() => 
  import('../features/itinerary')
);
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Image upload fails | Check imgbb API key in constants |
| PDF not generating | Ensure jsPDF is installed |
| Itinerary not updating | Check nights input validation |
| Search not working | Verify packages array structure |

## Contributing Guidelines

1. Keep components focused and single-responsibility
2. Add prop validation and error handling
3. Write meaningful comments
4. Follow existing naming conventions
5. Test before committing

## Dependencies

- React & Hooks
- lucide-react (icons)
- sweetalert2 (alerts)
- jsPDF (PDF generation)
- imgbb API (image hosting)
- wouter (routing)

## Related Documentation

- See `REFACTORING_DOCUMENTATION.md` for detailed architecture
- Check individual component files for detailed JSDoc
- Review `utils/constants.js` for configuration options
