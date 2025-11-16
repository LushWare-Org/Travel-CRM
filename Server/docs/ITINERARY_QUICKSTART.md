# Itinerary Module - Quick Start Guide

## 🚀 Quick Start

### Prerequisites
- MongoDB running
- Node.js installed
- Environment variables configured
- Authentication system working

### Start Server
```bash
cd Server
npm install
npm run dev
```

Server will start on `http://localhost:5000`

---

## 📋 Quick API Reference

### Base URL
```
http://localhost:5000/api/v1/itineraries
```

---

## Public Endpoints (No Auth Required)

### 1️⃣ Get All Itineraries
```bash
GET /api/v1/itineraries?page=1&limit=10
```

### 2️⃣ Get Single Itinerary
```bash
GET /api/v1/itineraries/:id
```

### 3️⃣ Get by Package ID
```bash
GET /api/v1/itineraries/package/:packageId
```

### 4️⃣ Preview Itinerary
```bash
GET /api/v1/itineraries/:id/preview
```

### 5️⃣ Download PDF
```bash
GET /api/v1/itineraries/:id/pdf
```

---

## Protected Endpoints (Auth Required)

### Authentication Header
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### 6️⃣ Create Itinerary
```bash
POST /api/v1/itineraries
Content-Type: application/json

{
  "package": "PACKAGE_ID",
  "days": [
    {
      "dayNumber": 1,
      "title": "Day 1 Title",
      "description": "Day 1 description...",
      "activities": ["Activity 1", "Activity 2"],
      "meals": {
        "breakfast": true,
        "lunch": true,
        "dinner": true
      }
    }
  ]
}
```

### 7️⃣ Update Itinerary
```bash
PUT /api/v1/itineraries/:id
Content-Type: application/json

{
  "days": [...]  // Updated days
}
```

### 8️⃣ Delete Itinerary
```bash
DELETE /api/v1/itineraries/:id
```

### 9️⃣ Clone Itinerary
```bash
POST /api/v1/itineraries/:id/clone
Content-Type: application/json

{
  "targetPackageId": "TARGET_PACKAGE_ID"
}
```

### 🔟 Add Day
```bash
POST /api/v1/itineraries/:id/days
Content-Type: application/json

{
  "dayNumber": 2,
  "title": "Day 2 Title",
  "description": "Day 2 description..."
}
```

### 1️⃣1️⃣ Update Day
```bash
PUT /api/v1/itineraries/:id/days/:dayNumber
Content-Type: application/json

{
  "title": "Updated title"
}
```

### 1️⃣2️⃣ Delete Day
```bash
DELETE /api/v1/itineraries/:id/days/:dayNumber
```

---

## 📦 Day Object Structure

```javascript
{
  "dayNumber": 1,                          // Required
  "title": "Arrival Day",                  // Required
  "description": "Full description...",    // Required
  "activities": ["Activity 1", "..."],     // Optional
  "accommodation": {                       // Optional
    "name": "Hotel Name",
    "type": "hotel",                       // hotel|resort|guesthouse|homestay|camp|other
    "rating": 5,                           // 0-5
    "address": "Address...",
    "contactNumber": "+1234567890"
  },
  "meals": {                               // Optional
    "breakfast": true,
    "lunch": true,
    "dinner": false
  },
  "transport": "car",                      // Optional: flight|train|bus|car|boat|walk|other
  "places": [                              // Optional
    {
      "name": "Place Name",
      "description": "Description...",
      "duration": "2 hours",
      "images": [
        {
          "public_id": "cloudinary_id",
          "url": "https://..."
        }
      ]
    }
  ],
  "images": [                              // Optional
    {
      "public_id": "cloudinary_id",
      "url": "https://..."
    }
  ],
  "notes": "Additional notes..."           // Optional
}
```

---

## ⚡ Testing with cURL

### Get All Itineraries
```bash
curl http://localhost:5000/api/v1/itineraries
```

### Create Itinerary (with Auth)
```bash
curl -X POST http://localhost:5000/api/v1/itineraries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "package": "PACKAGE_ID",
    "days": [{
      "dayNumber": 1,
      "title": "First Day",
      "description": "Description here..."
    }]
  }'
```

### Download PDF
```bash
curl http://localhost:5000/api/v1/itineraries/:id/pdf \
  -o itinerary.pdf
```

---

## 🧪 Testing with JavaScript/Axios

### Get Itineraries
```javascript
const axios = require('axios');

axios.get('http://localhost:5000/api/v1/itineraries')
  .then(response => console.log(response.data))
  .catch(error => console.error(error.response.data));
```

### Create Itinerary
```javascript
const token = 'YOUR_JWT_TOKEN';

axios.post('http://localhost:5000/api/v1/itineraries', {
  package: 'PACKAGE_ID',
  days: [{
    dayNumber: 1,
    title: 'Arrival',
    description: 'Welcome day...',
    activities: ['Check-in', 'Dinner']
  }]
}, {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(response => console.log(response.data))
.catch(error => console.error(error.response.data));
```

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {...}
}
```

### List Response (with pagination)
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

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "days.0.title",
      "message": "Title is required"
    }
  ]
}
```

---

## 🔑 Required Fields

### Creating Itinerary
- ✅ `package` - Package ID (MongoDB ObjectId)
- ✅ `days` - Array with at least 1 day
- ✅ `days[].dayNumber` - Sequential from 1
- ✅ `days[].title` - 3-200 characters
- ✅ `days[].description` - 10-2000 characters

### Optional but Recommended
- `activities` - List of activities
- `accommodation` - Where to stay
- `meals` - Meal inclusions
- `transport` - How to travel
- `places` - Places to visit
- `images` - Visual content

---

## ⚠️ Common Errors

### 400 - Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [...]
}
```
**Fix:** Check required fields and data types

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Not authorized"
}
```
**Fix:** Include valid JWT token in Authorization header

### 403 - Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```
**Fix:** Ensure user has admin or staff role

### 404 - Not Found
```json
{
  "success": false,
  "message": "Itinerary not found"
}
```
**Fix:** Check if ID is correct

---

## 🎯 Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |

---

## 🔒 Authentication Flow

1. **Login** to get JWT token
   ```
   POST /api/v1/auth/login
   ```

2. **Use token** in subsequent requests
   ```
   Authorization: Bearer YOUR_TOKEN
   ```

3. **Token expires** after configured time (check .env)

---

## 📁 File Locations

```
Server/
├── src/
│   ├── controllers/
│   │   └── itinerary.controller.js
│   ├── services/
│   │   └── itinerary.service.js
│   ├── validators/
│   │   └── itinerary.validator.js
│   ├── models/
│   │   └── itinerary.model.js
│   └── routes/
│       └── itinerary.routes.js
└── uploads/
    └── itineraries/
        └── (Generated PDFs here)
```

---

## 💡 Pro Tips

1. **Pagination**: Always use pagination for large datasets
   ```
   ?page=1&limit=20
   ```

2. **Filtering**: Filter by package ID
   ```
   ?packageId=PACKAGE_ID
   ```

3. **Sorting**: Sort by any field
   ```
   ?sort=-createdAt  (descending)
   ?sort=createdAt   (ascending)
   ```

4. **Day Numbers**: Must be sequential (1, 2, 3, ...)

5. **Status**: Use 'draft' for work-in-progress, 'published' when ready

---

## 🐛 Debugging

### Check Server Logs
```bash
# In development
npm run dev

# Logs will show in console
```

### Test Endpoint Availability
```bash
curl http://localhost:5000/health
```

### Verify Database Connection
Check MongoDB connection in server logs

---

## 📚 Full Documentation

For complete documentation, see:
- **API Docs**: `/docs/ITINERARY_API.md`
- **Implementation**: `/docs/ITINERARY_IMPLEMENTATION.md`

---

## 🎓 Example Workflow

### Complete Itinerary Creation Workflow

1. **Create Package** (if not exists)
2. **Create Itinerary** with basic days
   ```
   POST /api/v1/itineraries
   ```
3. **Add More Days** as needed
   ```
   POST /api/v1/itineraries/:id/days
   ```
4. **Update Days** with details
   ```
   PUT /api/v1/itineraries/:id/days/:dayNumber
   ```
5. **Preview** before publishing
   ```
   GET /api/v1/itineraries/:id/preview
   ```
6. **Generate PDF** for customer
   ```
   GET /api/v1/itineraries/:id/pdf
   ```
7. **Update Status** to published
   ```
   PUT /api/v1/itineraries/:id
   { "status": "published" }
   ```

---

## 🆘 Need Help?

- Check error messages for details
- Verify authentication token
- Ensure required fields are present
- Check data types match schema
- Review validation rules
- See full API documentation

---

**Happy Coding! 🚀**
