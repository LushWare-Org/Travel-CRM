# Itinerary Backend & Frontend Integration Guide

## Overview
This document provides a complete guide for the fully integrated itinerary system that connects frontend and backend following best practices.

---

## Architecture

### Backend Structure
```
Server/src/
├── models/
│   └── itinerary.model.js      # Mongoose schema with day-based structure
├── controllers/
│   └── itinerary.controller.js # All endpoint handlers
├── services/
│   └── itinerary.service.js    # Business logic
├── routes/
│   └── itinerary.routes.js     # Route definitions
└── validators/
    └── itinerary.validator.js  # Input validation
```

### Frontend Structure
```
Management/src/features/itinerary/
├── components/
│   ├── ItineraryEditor.jsx          # Edit form
│   ├── ItineraryDisplay.jsx         # Preview display
│   └── ...
├── hooks/
│   └── useItineraryForm.js          # Enhanced state management
├── services/
│   └── apiService.js                # Enhanced API integration
├── types/
│   └── index.js                     # Type definitions
└── utils/
    ├── constants.js                 # Constants & config
    └── helpers.js                   # Utility functions
```

---

## API Endpoints

### Base URL
```
/api/itineraries
```

### Endpoints

#### 1. Get Dropdown Options
```
GET /api/itineraries/dropdown-options
Public endpoint - no auth required
Returns accommodation types, transport types, meals, statuses
```

#### 2. Get All Itineraries
```
GET /api/itineraries?page=1&limit=10&status=draft&packageId=xyz
Query params:
  - page: pagination page (default: 1)
  - limit: items per page (default: 10)
  - sort: sort field (default: -createdAt)
  - packageId: filter by package (optional)
  - status: filter by status (optional)
```

#### 3. Get Itinerary by ID
```
GET /api/itineraries/:id
Returns complete itinerary with all days
```

#### 4. Get Itinerary by Package
```
GET /api/itineraries/package/:packageId
Returns itinerary for specific package
404 if not found
```

#### 5. Create Itinerary
```
POST /api/itineraries
Auth: Required (admin, staff)
Body: {
  package: "packageId",
  days: [{
    dayNumber: 1,
    title: "Day 1 Title",
    description: "Description",
    activities: ["Activity 1", "Activity 2"],
    accommodation: {
      name: "Hotel Name",
      type: "hotel",
      rating: 4,
      address: "Address",
      contactNumber: "+1234567890"
    },
    meals: { breakfast: true, lunch: true, dinner: false },
    transport: "flight",
    places: [{
      name: "Place Name",
      description: "Description",
      duration: "2 hours"
    }],
    images: [{public_id: "id", url: "url"}],
    notes: "Additional notes"
  }],
  status: "draft"
}
```

#### 6. Update Itinerary
```
PUT /api/itineraries/:id
Auth: Required (creator or admin)
Body: { days: [...], status: "published" }
```

#### 7. Delete Itinerary
```
DELETE /api/itineraries/:id
Auth: Required (creator or admin)
Soft deletes or hard deletes based on configuration
```

#### 8. Add Day to Itinerary
```
POST /api/itineraries/:id/days
Auth: Required
Body: { /* day data */ }
Auto-increments dayNumber
```

#### 9. Update Specific Day
```
PUT /api/itineraries/:id/days/:dayNumber
Auth: Required
Body: { /* updated day data */ }
```

#### 10. Delete Specific Day
```
DELETE /api/itineraries/:id/days/:dayNumber
Auth: Required
Auto-renumbers remaining days
```

#### 11. Preview Itinerary
```
GET /api/itineraries/:id/preview
Public endpoint
Returns formatted preview suitable for UI display
Calculates statistics and metadata
```

#### 12. Download PDF
```
GET /api/itineraries/:id/pdf
Auth: Required
Returns PDF file with branded layout
```

#### 13. Clone Itinerary
```
POST /api/itineraries/:id/clone
Auth: Required
Body: { targetPackageId: "packageId" }
Clones all days to new package
Status set to 'draft'
```

---

## Frontend Integration

### Using the Enhanced Hook

```javascript
import { useItineraryForm } from '../hooks/useItineraryForm';

function ItineraryEditor({ packageId }) {
  const {
    formData,
    loading,
    error,
    unsavedChanges,
    itineraryId,
    addDay,
    removeDay,
    updateDay,
    saveItinerary,
    publishItinerary,
    downloadPDF,
  } = useItineraryForm(packageId);

  const handleAddDay = () => {
    addDay();
  };

  const handleSave = async () => {
    try {
      await saveItinerary('draft');
      // Success handled by hook (Swal notification)
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <div>
      {loading && <LoadingSpinner />}
      {error && <ErrorAlert message={error} />}
      
      <ItineraryDisplay 
        days={formData.days}
        onAddDay={handleAddDay}
        onRemoveDay={removeDay}
        onUpdateDay={updateDay}
      />

      <div className="flex gap-3">
        <button onClick={() => saveItinerary('draft')}>
          Save Draft
        </button>
        <button onClick={publishItinerary}>
          Publish
        </button>
        {itineraryId && (
          <button onClick={downloadPDF}>
            Download PDF
          </button>
        )}
      </div>
    </div>
  );
}
```

### API Service Usage

```javascript
import ApiService from '../services/apiService';

// Get dropdown options
const options = await ApiService.getDropdownOptions();

// Create itinerary
const itinerary = await ApiService.createItinerary({
  package: packageId,
  days: daysArray,
  status: 'draft'
});

// Update day
await ApiService.updateDay(itineraryId, dayNumber, updatedDayData);

// Download PDF
const blob = await ApiService.downloadItineraryPDF(itineraryId);
```

---

## Data Structure

### Itinerary Model
```javascript
{
  _id: ObjectId,
  package: ObjectId (ref Package),
  days: [
    {
      dayNumber: Number,
      title: String,
      description: String,
      activities: [String],
      accommodation: {
        name: String,
        type: Enum ['hotel', 'resort', 'guesthouse', 'homestay', 'camp', 'other'],
        rating: Number (0-5),
        address: String,
        contactNumber: String
      },
      meals: {
        breakfast: Boolean,
        lunch: Boolean,
        dinner: Boolean
      },
      transport: Enum ['flight', 'train', 'bus', 'car', 'boat', 'walk', 'other'],
      places: [
        {
          name: String,
          description: String,
          duration: String,
          images: [{public_id: String, url: String}]
        }
      ],
      images: [{public_id: String, url: String}],
      notes: String
    }
  ],
  status: Enum ['draft', 'published', 'archived'],
  version: Number,
  metadata: {
    totalActivities: Number,
    totalPlaces: Number,
    mealsIncluded: {breakfast: Number, lunch: Number, dinner: Number},
    lastModifiedBy: ObjectId
  },
  createdBy: ObjectId (ref User),
  createdAt: Date,
  updatedAt: Date
}
```

---

## Key Features

### 1. **Day Management**
- Add/remove days
- Auto-renumbering when deleting
- Validation for required fields

### 2. **Status Management**
- Draft: In progress
- Published: Ready for booking
- Archived: No longer available

### 3. **Error Handling**
- Comprehensive validation on backend
- User-friendly error messages
- SweetAlert2 notifications

### 4. **Unsaved Changes Tracking**
- Tracks if form has unsaved changes
- Warns before navigation

### 5. **PDF Export**
- Branded itinerary PDFs
- Includes all details and images
- Downloadable for sharing

### 6. **Itinerary Cloning**
- Clone itinerary to another package
- Saves time for similar packages

### 7. **Metadata Tracking**
- Total activities count
- Total places count
- Meals included count
- Last modified by user

---

## Best Practices Implemented

### Backend
1. **Separation of Concerns**
   - Controller: Request handling
   - Service: Business logic
   - Model: Data structure
   - Validator: Input validation

2. **Error Handling**
   - Custom AppError class
   - Proper HTTP status codes
   - Detailed error messages

3. **Authorization**
   - Creator can only edit own itineraries
   - Admin can edit any itinerary
   - Delete requires admin role

4. **Validation**
   - Input validation with express-validator
   - Schema validation with Mongoose
   - Custom validation rules

5. **Performance**
   - Database indexes on common queries
   - Population only when needed
   - Pagination support

### Frontend
1. **State Management**
   - Centralized with custom hook
   - Proper loading/error states
   - Unsaved changes tracking

2. **API Integration**
   - Standardized request format
   - Error handling with try-catch
   - User feedback with notifications

3. **Component Architecture**
   - Separation of concerns
   - Reusable components
   - Props-based data flow

4. **Form Handling**
   - Validation on submit
   - Debouncing for auto-save (optional)
   - Real-time feedback

---

## Common Workflows

### Creating a Package with Itinerary

1. Create package via Package endpoint
2. Get package ID
3. Create itinerary with package ID and days array
4. Save returns itinerary ID
5. Can update days individually later

### Editing Existing Itinerary

1. Load itinerary by package ID
2. Modify days as needed
3. Save changes (update endpoint)
4. Can publish or keep as draft

### Downloading PDF

1. Ensure itinerary is saved (has ID)
2. Call downloadPDF()
3. Returns blob
4. Browser handles download

---

## Error Handling

### Common Errors

```
400 Bad Request
- Missing required fields
- Invalid data types
- Validation failures

401 Unauthorized
- Missing authentication token
- Expired token

403 Forbidden
- Not authorized to perform action
- Insufficient permissions

404 Not Found
- Package doesn't exist
- Itinerary doesn't exist
- Day doesn't exist

409 Conflict
- Itinerary already exists for package
- Invalid day number

500 Server Error
- Database connection issues
- Unexpected errors
```

### Frontend Error Handling

All API calls wrapped with try-catch. Errors displayed via SweetAlert2 toast notifications.

---

## Testing Checklist

- [ ] Create package without itinerary
- [ ] Create package with itinerary
- [ ] Add days to itinerary
- [ ] Update day information
- [ ] Remove days (check renumbering)
- [ ] Save as draft
- [ ] Publish itinerary
- [ ] Download PDF
- [ ] Clone itinerary
- [ ] Delete itinerary
- [ ] Authorization checks
- [ ] Validation on missing fields
- [ ] Pagination working
- [ ] Error messages clear

---

## Environment Variables

```
# Frontend (.env)
VITE_API_URL=http://localhost:5000/api

# Backend (.env)
DATABASE_URL=mongodb://...
JWT_SECRET=your-secret
NODE_ENV=development
```

---

## Deployment Notes

1. Ensure database indexes are created
2. Update API base URL for production
3. Configure CORS properly
4. Set up authentication tokens
5. Test all endpoints in production environment
6. Monitor error logs

---

## Future Enhancements

1. Real-time collaboration on itinerary editing
2. Comments and notes on specific days
3. Integration with booking system
4. Multi-language support for itineraries
5. Mobile app synchronization
6. Image gallery improvements
7. Cost breakdown by day
8. Weather forecast integration
