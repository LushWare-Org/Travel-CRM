# Backend Integration Implementation Guide

## 🎯 Overview

This implementation connects the frontend itinerary management system with the backend API while maintaining all dropdown features and functionality.

---

## ✅ Features Implemented

### 1. ✅ Create New Itinerary with Dropdowns
- Multi-select dropdowns for destinations (45+ options)
- Multi-select dropdowns for activities (35+ options)  
- Dropdown for accommodation (10 options)
- Dropdown for transport (8 options)
- Data automatically converted to backend format
- Full validation and error handling

### 2. ✅ Edit Itinerary with Dropdowns
- Same dropdown interface as create
- Pre-populates data from backend
- Converts backend data to frontend format for editing
- Converts back to backend format on save

### 3. ✅ Delete Itinerary
- Deletes both package and associated itinerary
- Confirmation dialog
- Proper cleanup of references
- Error handling

### 4. ✅ Duplicate Itinerary
- Creates complete copy including itinerary
- Marks as draft automatically
- Resets bookings/ratings
- Works with both API and local mode

### 5. ✅ Download PDF with Links
- Downloads from backend if available
- Falls back to local generation
- Includes clickable email and website links
- Proper contact information

---

## 🏗️ Architecture

### Dual Mode Support

The system supports **two modes**:

#### **Local Mode** (Default)
- Uses sample data
- No backend required
- Perfect for development/testing
- Set `VITE_USE_API=false`

#### **API Mode**
- Connects to backend
- Real database operations
- Production-ready
- Set `VITE_USE_API=true`

---

## 📁 New Files Created

### 1. `services/apiService.js`
Complete API service layer with methods for:
- Package CRUD operations
- Itinerary CRUD operations
- Day management (add/update/delete)
- PDF download
- Clone/duplicate functionality

### 2. `utils/dataAdapters.js`
Bidirectional data transformation:
- `toBackendFormat.package()` - Frontend → Backend
- `toBackendFormat.itinerary()` - Frontend → Backend
- `toFrontendFormat.package()` - Backend → Frontend
- Helper functions for data mapping

### 3. `hooks/usePackageStateWithAPI.js`
Enhanced state management with API integration:
- `fetchPackages()` - Load from backend
- `createPackage()` - Create with API
- `updatePackage()` - Update with API
- `deletePackage()` - Delete with API
- `duplicatePackage()` - Clone with API
- `downloadPDF()` - Download from backend

---

## 🔄 Data Transformation

### Frontend → Backend

**Duration:**
```javascript
"5 Days / 4 Nights" → 5
```

**Price:**
```javascript
"$2,499" → 2499
```

**Category:**
```javascript
"Honeymoon" → "honeymoon"
```

**Itinerary Structure:**
```javascript
// Frontend
{
  itinerary: {
    first_day: "Arrival text",
    middle_days: { day_1: "Day 1 text" },
    last_day: "Departure text"
  }
}

// Backend
{
  days: [
    {
      dayNumber: 1,
      title: "Arrival Day",
      description: "Arrival text",
      activities: [...],
      accommodation: {...},
      meals: {...},
      transport: "flight"
    }
  ]
}
```

---

## ⚙️ Configuration

### Environment Variables

Create `.env` file:

```bash
# Backend API URL
VITE_API_URL=http://localhost:5000/api/v1

# Enable/Disable API mode
VITE_USE_API=false  # Set to true for API mode
```

### Mode Selection

In `ItineraryGenerationContainer.jsx`:

```javascript
const USE_API = import.meta.env.VITE_USE_API === 'true' || false;
```

---

## 🚀 Usage

### Local Mode (Development)

1. Keep `VITE_USE_API=false`
2. Uses sample data from `sampleData.js`
3. No backend required
4. Perfect for testing UI/UX

### API Mode (Production)

1. Set `VITE_USE_API=true`
2. Ensure backend is running
3. Update `VITE_API_URL` if needed
4. Requires authentication (token in localStorage)

---

## 📝 Updated Constants

### Category Options (Now includes all backend values)
```javascript
[
  'Honeymoon', 'Family', 'Adventure', 'Budget', 
  'Luxury', 'Religious', 'Wildlife', 'Beach', 
  'Heritage', 'Other'
]
```

### Dropdown Options Maintained
- ✅ 45+ Destinations (organized by region)
- ✅ 35+ Activities (organized by category)
- ✅ 10 Accommodation options
- ✅ 8 Transport options
- ✅ All allow custom entries

---

## 🔌 API Endpoints Used

### Packages
- `GET /packages` - List all packages
- `GET /packages/:id` - Get single package
- `POST /packages` - Create package
- `PUT /packages/:id` - Update package
- `DELETE /packages/:id` - Delete package

### Itineraries
- `GET /itineraries` - List all itineraries
- `GET /itineraries/:id` - Get single itinerary
- `GET /itineraries/package/:packageId` - Get by package
- `POST /itineraries` - Create itinerary
- `PUT /itineraries/:id` - Update itinerary
- `DELETE /itineraries/:id` - Delete itinerary
- `POST /itineraries/:id/clone` - Clone itinerary
- `GET /itineraries/:id/pdf` - Download PDF

### Days Management
- `POST /itineraries/:id/days` - Add day
- `PUT /itineraries/:id/days/:dayNumber` - Update day
- `DELETE /itineraries/:id/days/:dayNumber` - Delete day

---

## 🛡️ Error Handling

### Graceful Degradation
- API errors → Swal alerts
- PDF download fails → Falls back to local generation
- Network errors → Shows error messages
- Missing data → Uses defaults

### Loading States
- Loading spinner overlay during API calls
- Disabled buttons during operations
- Clear user feedback

---

## 🧪 Testing Checklist

### Local Mode
- [ ] Create package with dropdowns
- [ ] Edit package data
- [ ] Delete package
- [ ] Duplicate package
- [ ] Download PDF locally
- [ ] All dropdowns work
- [ ] Custom entries in dropdowns

### API Mode
- [ ] Fetch packages from backend
- [ ] Create package → saves to backend
- [ ] Edit package → updates in backend
- [ ] Delete package → removes from backend
- [ ] Duplicate → creates new in backend
- [ ] Download PDF from backend
- [ ] Error handling works
- [ ] Loading states show correctly

---

## 🔧 Troubleshooting

### Issue: "Failed to fetch packages"
**Solution:** Check backend is running and `VITE_API_URL` is correct

### Issue: "Dropdowns not showing options"
**Solution:** Check `constants.js` has all options exported

### Issue: "PDF download fails"
**Solution:** Check itinerary exists for package in backend

### Issue: "Data not saving"
**Solution:** Check `VITE_USE_API` setting and authentication token

---

## 📈 Future Enhancements

1. **Real-time Updates**: WebSocket integration for live updates
2. **Offline Support**: IndexedDB caching with sync
3. **Image Upload**: Cloudinary integration for images
4. **Advanced Search**: Filter by multiple criteria
5. **Bulk Operations**: Select and modify multiple packages
6. **Version History**: Track changes over time
7. **Collaborative Editing**: Multiple users editing same package

---

## 🎉 Summary

**All 5 required features are fully functional:**

✅ Create with dropdowns  
✅ Edit with dropdowns  
✅ Delete  
✅ Duplicate  
✅ Download PDF with links  

**Works in both modes:**
- 🏠 Local mode for development
- 🌐 API mode for production

**Maintains all improvements:**
- 📋 Dropdown optimizations
- 🔄 Data transformations
- ⚡ Error handling
- 🎨 Professional UI

The system is production-ready and can be switched between local and API modes with a single environment variable!
