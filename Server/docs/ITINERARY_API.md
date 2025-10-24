# Itinerary Generation Module - API Documentation

## Overview
Complete backend implementation for the Itinerary Generation Module with industry-standard best practices.

## Features Implemented

### ✅ Core Features
- ✏️ **Package Creation & Editing** - Full CRUD operations for itineraries
- 🏕️ **Day-wise Itinerary Builder** - Add/update/delete individual days
- 🗂️ **Package Categorization** - Status-based filtering (draft, published, archived)
- 🖼️ **Media Management** - Support for images in days and places
- 🧾 **Dynamic Itinerary Preview** - Formatted preview generation
- 📤 **PDF Generation & Download** - Professional branded PDF creation
- 🌍 **Frontend Display Integration** - RESTful API for frontend consumption
- 🔒 **Access Control** - Role-based authentication (Admin/Staff only)

## API Endpoints

### Base URL
```
/api/v1/itineraries
```

---

## Public Endpoints

### 1. Get All Itineraries
```http
GET /api/v1/itineraries
```

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 10, max: 100)
- `sort` (optional) - Sort field (default: -createdAt)
- `packageId` (optional) - Filter by package ID

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "totalPages": 5,
  "currentPage": 1,
  "data": [...]
}
```

---

### 2. Get Single Itinerary
```http
GET /api/v1/itineraries/:id
```

**Parameters:**
- `id` - Itinerary ID (MongoDB ObjectId)

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "64f5a8c9e123456789abcdef",
    "package": {...},
    "days": [...],
    "status": "published",
    "metadata": {...}
  }
}
```

---

### 3. Get Itinerary by Package
```http
GET /api/v1/itineraries/package/:packageId
```

**Parameters:**
- `packageId` - Package ID (MongoDB ObjectId)

**Response:**
```json
{
  "success": true,
  "data": {...}
}
```

---

### 4. Preview Itinerary
```http
GET /api/v1/itineraries/:id/preview
```

**Description:** Returns formatted preview data for frontend display

**Response:**
```json
{
  "success": true,
  "data": {
    "packageInfo": {
      "name": "Bali Paradise",
      "destination": "Bali, Indonesia",
      "duration": 7,
      "price": 1299,
      "category": "luxury",
      "coverImage": "https://..."
    },
    "itinerary": {
      "totalDays": 7,
      "days": [...]
    },
    "inclusions": [...],
    "exclusions": [...]
  }
}
```

---

### 5. Download Itinerary PDF
```http
GET /api/v1/itineraries/:id/pdf
```

**Description:** Generates and downloads a branded PDF itinerary

**Response:** File download (application/pdf)

---

## Protected Endpoints (Admin/Staff Only)

### 6. Create Itinerary
```http
POST /api/v1/itineraries
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "package": "64f5a8c9e123456789abcdef",
  "days": [
    {
      "dayNumber": 1,
      "title": "Arrival in Bali",
      "description": "Welcome to Bali! Upon arrival...",
      "activities": [
        "Airport pickup",
        "Hotel check-in",
        "Welcome dinner"
      ],
      "accommodation": {
        "name": "Grand Hyatt Bali",
        "type": "resort",
        "rating": 5,
        "address": "Nusa Dua Beach",
        "contactNumber": "+62-361-123456"
      },
      "meals": {
        "breakfast": false,
        "lunch": false,
        "dinner": true
      },
      "transport": "car",
      "places": [
        {
          "name": "Nusa Dua Beach",
          "description": "Beautiful white sand beach",
          "duration": "2 hours",
          "images": [
            {
              "public_id": "cloudinary_id",
              "url": "https://..."
            }
          ]
        }
      ],
      "images": [
        {
          "public_id": "day1_img",
          "url": "https://..."
        }
      ],
      "notes": "Casual attire recommended"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Itinerary created successfully",
  "data": {...}
}
```

**Validation Rules:**
- Package ID must be valid and exist
- At least one day is required
- Day numbers must be sequential starting from 1
- Title: 3-200 characters
- Description: 10-2000 characters
- No duplicate itinerary for the same package

---

### 7. Update Itinerary
```http
PUT /api/v1/itineraries/:id
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:** (Same structure as create, all fields optional)

**Response:**
```json
{
  "success": true,
  "message": "Itinerary updated successfully",
  "data": {...}
}
```

---

### 8. Delete Itinerary
```http
DELETE /api/v1/itineraries/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Itinerary deleted successfully",
  "data": null
}
```

---

### 9. Clone Itinerary
```http
POST /api/v1/itineraries/:id/clone
```

**Description:** Clone an itinerary to another package

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "targetPackageId": "64f5a8c9e123456789abcdef"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Itinerary cloned successfully",
  "data": {...}
}
```

---

## Day Management Endpoints

### 10. Add Day to Itinerary
```http
POST /api/v1/itineraries/:id/days
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "dayNumber": 8,
  "title": "Departure Day",
  "description": "Check-out and transfer to airport",
  "activities": ["Hotel check-out", "Airport transfer"],
  "transport": "car",
  "meals": {
    "breakfast": true,
    "lunch": false,
    "dinner": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Day added successfully",
  "data": {...}
}
```

---

### 11. Update Specific Day
```http
PUT /api/v1/itineraries/:id/days/:dayNumber
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:** (All fields optional)
```json
{
  "title": "Updated title",
  "activities": ["New activity"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Day updated successfully",
  "data": {...}
}
```

---

### 12. Delete Specific Day
```http
DELETE /api/v1/itineraries/:id/days/:dayNumber
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Day deleted successfully",
  "data": {...}
}
```

---

## Data Models

### Itinerary Schema

```javascript
{
  package: ObjectId (ref: Package) - unique, indexed
  days: [
    {
      dayNumber: Number (required)
      title: String (required, 3-200 chars)
      description: String (required, 10-2000 chars)
      activities: [String]
      accommodation: {
        name: String
        type: enum ['hotel', 'resort', 'guesthouse', 'homestay', 'camp', 'other']
        rating: Number (0-5)
        address: String
        contactNumber: String
      }
      meals: {
        breakfast: Boolean
        lunch: Boolean
        dinner: Boolean
      }
      transport: enum ['flight', 'train', 'bus', 'car', 'boat', 'walk', 'other']
      places: [
        {
          name: String
          description: String
          duration: String
          images: [{ public_id: String, url: String }]
        }
      ]
      images: [{ public_id: String, url: String }]
      notes: String
    }
  ]
  status: enum ['draft', 'published', 'archived'] - default: draft
  version: Number - auto-incremented on update
  metadata: {
    totalActivities: Number
    totalPlaces: Number
    mealsIncluded: {
      breakfast: Number
      lunch: Number
      dinner: Number
    }
    lastModifiedBy: ObjectId (ref: User)
  }
  createdBy: ObjectId (ref: User) - required
  createdAt: Date
  updatedAt: Date
}
```

### Virtual Fields
- `totalDays` - Total number of days
- `completionPercentage` - Percentage of required fields filled

---

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "days.0.title",
      "message": "Day title is required",
      "value": ""
    }
  ]
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (Validation errors)
- `401` - Unauthorized
- `403` - Forbidden (Insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Best Practices Implemented

### 1. **Security**
- JWT-based authentication
- Role-based access control (RBAC)
- Input validation and sanitization
- MongoDB injection prevention
- XSS protection

### 2. **Performance**
- Database indexing on frequently queried fields
- Pagination for large datasets
- Efficient query population
- Metadata pre-calculation

### 3. **Code Quality**
- Separation of concerns (Controller → Service → Model)
- Async error handling with asyncHandler
- Centralized error handling
- Input validation with express-validator
- Clean code principles

### 4. **API Design**
- RESTful conventions
- Consistent response format
- Proper HTTP status codes
- Comprehensive error messages
- Query parameter filtering

### 5. **Documentation**
- JSDoc comments
- Detailed endpoint descriptions
- Request/response examples
- Validation rules

---

## PDF Generation Features

The PDF generator creates professional, branded itineraries with:

- **Cover Page** - Package name, destination, duration, category
- **Package Overview** - Description, highlights, quick facts
- **Day-wise Pages** - Detailed daily itinerary with activities, places, accommodation
- **Inclusions/Exclusions** - What's included and not included
- **Terms & Conditions** - Travel terms
- **Professional Styling** - Branded colors, fonts, layout
- **Page Numbers** - Footer with page numbers and contact info

---

## Usage Examples

### Creating an Itinerary with Postman/Axios

```javascript
const axios = require('axios');

const createItinerary = async () => {
  try {
    const response = await axios.post(
      'http://localhost:5000/api/v1/itineraries',
      {
        package: '64f5a8c9e123456789abcdef',
        days: [
          {
            dayNumber: 1,
            title: 'Arrival in Paris',
            description: 'Welcome to the City of Light...',
            activities: ['Airport pickup', 'Hotel check-in'],
            meals: { breakfast: false, lunch: false, dinner: true },
            transport: 'car'
          }
        ]
      },
      {
        headers: {
          'Authorization': 'Bearer YOUR_JWT_TOKEN',
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(response.data);
  } catch (error) {
    console.error(error.response.data);
  }
};
```

### Downloading PDF

```javascript
const downloadPDF = async (itineraryId) => {
  try {
    const response = await axios.get(
      `http://localhost:5000/api/v1/itineraries/${itineraryId}/pdf`,
      { responseType: 'blob' }
    );
    
    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'itinerary.pdf');
    document.body.appendChild(link);
    link.click();
  } catch (error) {
    console.error(error);
  }
};
```

---

## Testing

### Manual Testing Checklist

- [ ] Create itinerary with valid data
- [ ] Create itinerary with invalid data (validation)
- [ ] Get all itineraries with pagination
- [ ] Get single itinerary
- [ ] Get itinerary by package ID
- [ ] Update itinerary
- [ ] Add day to itinerary
- [ ] Update specific day
- [ ] Delete specific day
- [ ] Delete entire itinerary
- [ ] Clone itinerary
- [ ] Preview itinerary
- [ ] Download PDF
- [ ] Test authentication
- [ ] Test authorization (roles)

---

## Database Indexes

```javascript
// Indexes for optimal query performance
itinerarySchema.index({ package: 1 }); // Unique index
itinerarySchema.index({ status: 1, createdAt: -1 }); // Compound index
itinerarySchema.index({ createdBy: 1 }); // Single field index
```

---

## Environment Variables Required

```env
MONGODB_URI=mongodb://...
JWT_SECRET=your_jwt_secret
NODE_ENV=development
PORT=5000
```

---

## Future Enhancements

1. **Advanced Features**
   - Itinerary templates
   - Multi-language support
   - Weather integration
   - Map integration
   - Cost breakdown per day

2. **Analytics**
   - Track most viewed itineraries
   - Popular destinations
   - Conversion rates

3. **Collaboration**
   - Multiple editors
   - Version history
   - Change tracking
   - Comments/notes

4. **Export Options**
   - Excel export
   - Word document
   - Email sharing
   - Social media sharing

---

## Support

For issues or questions, contact the development team.

**Created by:** Trip Sky Way Development Team  
**Last Updated:** October 24, 2025  
**Version:** 1.0.0
