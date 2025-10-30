# Package API Documentation

## Overview
The Package API provides comprehensive endpoints for managing travel packages in the Trip Sky Way application. It includes features for creating, reading, updating, deleting packages with advanced filtering, searching, and statistics.

## Base URL
```
/api/packages
```

## Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

## Error Handling
All error responses follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "param": "field_name",
      "msg": "Validation message"
    }
  ]
}
```

---

## Endpoints

### 1. Get All Packages
**GET** `/api/packages`

Retrieve all packages with advanced filtering, sorting, and pagination.

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | - | Search by name, description, or destination |
| `category` | string | - | Filter by category (honeymoon, family, adventure, budget, luxury, religious, wildlife, beach, heritage, other) |
| `minPrice` | number | - | Minimum price filter |
| `maxPrice` | number | - | Maximum price filter |
| `minDuration` | number | - | Minimum duration in days |
| `maxDuration` | number | - | Maximum duration in days |
| `difficulty` | string | - | Filter by difficulty (easy, moderate, difficult) |
| `isActive` | boolean | true | Filter by active status |
| `isFeatured` | boolean | - | Filter by featured status |
| `sortBy` | string | createdAt | Sort field (name, price, duration, rating, bookings, createdAt) |
| `sortOrder` | string | desc | Sort order (asc, desc) |
| `page` | number | 1 | Page number for pagination |
| `limit` | number | 10 | Results per page (1-100) |

#### Example Request
```bash
GET /api/packages?category=adventure&minPrice=100&maxPrice=5000&sortBy=rating&sortOrder=desc&page=1&limit=10
```

#### Example Response
```json
{
  "success": true,
  "message": "Packages retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Mountain Adventure Package",
      "description": "An exciting mountain adventure...",
      "destination": "Himalayas",
      "duration": 7,
      "price": 2999,
      "category": "adventure",
      "difficulty": "moderate",
      "rating": 4.8,
      "bookings": 45,
      "isActive": true,
      "isFeatured": true,
      "createdAt": "2024-10-29T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

---

### 2. Get Single Package
**GET** `/api/packages/:id`

Retrieve detailed information about a specific package.

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | MongoDB ObjectId of the package |

#### Example Request
```bash
GET /api/packages/507f1f77bcf86cd799439011
```

#### Example Response
```json
{
  "success": true,
  "message": "Package retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Mountain Adventure Package",
    "slug": "mountain-adventure-package",
    "description": "An exciting mountain adventure...",
    "destination": "Himalayas",
    "duration": 7,
    "price": 2999,
    "category": "adventure",
    "difficulty": "moderate",
    "maxGroupSize": 15,
    "inclusions": ["Accommodation", "Meals", "Guide"],
    "exclusions": ["Travel insurance"],
    "highlights": ["Stunning views", "Expert guides"],
    "terms": ["Non-refundable", "Advance booking required"],
    "rating": 4.8,
    "numReviews": 23,
    "bookings": 45,
    "views": 320,
    "isActive": true,
    "isFeatured": true,
    "images": [
      {
        "public_id": "cloud_id_1",
        "url": "https://cloudinary.com/image1.jpg"
      }
    ],
    "createdBy": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Admin User",
      "email": "admin@example.com"
    },
    "reviews": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "rating": 5,
        "comment": "Great experience!",
        "author": {
          "_id": "507f1f77bcf86cd799439014",
          "name": "John Doe"
        },
        "createdAt": "2024-10-28T12:00:00Z"
      }
    ],
    "createdAt": "2024-10-29T10:30:00Z",
    "updatedAt": "2024-10-29T10:30:00Z"
  }
}
```

---

### 3. Create Package
**POST** `/api/packages`

Create a new travel package (Requires Authentication: admin, staff roles)

#### Required Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Request Body
```json
{
  "name": "Mountain Adventure Package",
  "description": "An exciting mountain adventure with expert guides...",
  "destination": "Himalayas",
  "duration": 7,
  "price": 2999,
  "category": "adventure",
  "difficulty": "moderate",
  "maxGroupSize": 15,
  "inclusions": ["Accommodation", "Meals", "Guide"],
  "exclusions": ["Travel insurance"],
  "highlights": ["Stunning views", "Expert guides"],
  "terms": ["Non-refundable", "Advance booking required"],
  "availableFrom": "2024-11-01T00:00:00Z",
  "availableTo": "2024-12-31T23:59:59Z",
  "isFeatured": true
}
```

#### Example Request
```bash
curl -X POST http://localhost:3000/api/packages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mountain Adventure Package",
    "description": "An exciting mountain adventure...",
    "destination": "Himalayas",
    "duration": 7,
    "price": 2999,
    "category": "adventure"
  }'
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Package created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Mountain Adventure Package",
    "slug": "mountain-adventure-package",
    ...
  }
}
```

---

### 4. Update Package
**PUT** `/api/packages/:id`

Update an existing package (Requires Authentication: package creator or admin)

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | MongoDB ObjectId of the package |

#### Request Body
All fields are optional. Only include fields you want to update.

```json
{
  "name": "Updated Package Name",
  "price": 3499,
  "isActive": true,
  "isFeatured": false
}
```

#### Example Request
```bash
curl -X PUT http://localhost:3000/api/packages/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 3499,
    "isFeatured": true
  }'
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Package updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    ...
  }
}
```

---

### 5. Delete Package
**DELETE** `/api/packages/:id`

Delete a package (Requires Authentication: admin only)

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | MongoDB ObjectId of the package |

#### Example Request
```bash
curl -X DELETE http://localhost:3000/api/packages/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Package deleted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    ...
  }
}
```

---

### 6. Get Featured Packages
**GET** `/api/packages/featured/all`

Retrieve all featured packages for homepage display.

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 6 | Number of packages to retrieve |

#### Example Request
```bash
GET /api/packages/featured/all?limit=6
```

#### Response
```json
{
  "success": true,
  "message": "Featured packages retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Mountain Adventure Package",
      ...
    }
  ]
}
```

---

### 7. Get Package Statistics
**GET** `/api/packages/stats/all`

Get comprehensive package statistics for dashboard.

#### Example Request
```bash
GET /api/packages/stats/all
```

#### Response
```json
{
  "success": true,
  "message": "Package statistics retrieved successfully",
  "data": {
    "totalPackages": 150,
    "publishedPackages": 120,
    "totalBookings": 3400,
    "averageRating": 4.5,
    "totalRevenue": 450000,
    "avgPrice": 3000,
    "minPrice": 500,
    "maxPrice": 15000
  }
}
```

---

### 8. Search Packages
**GET** `/api/packages/search/query`

Full-text search across package names, descriptions, and destinations.

#### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string (required) | Search term |

#### Example Request
```bash
GET /api/packages/search/query?query=mountain
```

#### Response
```json
{
  "success": true,
  "message": "Search results retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Mountain Adventure Package",
      ...
    }
  ]
}
```

---

### 9. Get Packages by Category
**GET** `/api/packages/category/:category`

Retrieve all packages in a specific category.

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Category name |

#### Query Parameters
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 10 | Number of packages to retrieve |

#### Example Request
```bash
GET /api/packages/category/adventure?limit=10
```

#### Response
```json
{
  "success": true,
  "message": "Packages in adventure category retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Mountain Adventure Package",
      ...
    }
  ]
}
```

---

### 10. Increment Package Bookings
**POST** `/api/packages/:id/increment-bookings`

Increment booking count for a package (Requires Authentication)

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | MongoDB ObjectId of the package |

#### Example Request
```bash
curl -X POST http://localhost:3000/api/packages/507f1f77bcf86cd799439011/increment-bookings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Response
```json
{
  "success": true,
  "message": "Package bookings incremented successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "bookings": 46,
    ...
  }
}
```

---

### 11. Update Package Rating
**POST** `/api/packages/:id/update-rating`

Update package rating when a review is created/updated (Requires Authentication)

#### URL Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | MongoDB ObjectId of the package |

#### Request Body
```json
{
  "rating": 4.5,
  "reviewCount": 25
}
```

#### Example Request
```bash
curl -X POST http://localhost:3000/api/packages/507f1f77bcf86cd799439011/update-rating \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 4.5,
    "reviewCount": 25
  }'
```

#### Response
```json
{
  "success": true,
  "message": "Package rating updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "rating": 4.5,
    "numReviews": 25,
    ...
  }
}
```

---

## Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful GET, PUT, or DELETE request |
| 201 | Created | Successful POST request creating a resource |
| 400 | Bad Request | Invalid request parameters or validation failed |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Authenticated but not authorized to perform action |
| 404 | Not Found | Resource not found |
| 500 | Server Error | Internal server error |

---

## Common Use Cases

### 1. Homepage - Display Featured Packages
```bash
GET /api/packages/featured/all?limit=6
```

### 2. Package Listing Page with Filters
```bash
GET /api/packages?category=adventure&minPrice=1000&maxPrice=5000&sortBy=rating&sortOrder=desc&page=1&limit=12
```

### 3. Search Functionality
```bash
GET /api/packages/search/query?query=mountain
```

### 4. Category Page
```bash
GET /api/packages/category/adventure?limit=20
```

### 5. Dashboard Statistics
```bash
GET /api/packages/stats/all
```

### 6. Package Details View
```bash
GET /api/packages/507f1f77bcf86cd799439011
```

### 7. After Booking Creation
```bash
POST /api/packages/507f1f77bcf86cd799439011/increment-bookings
```

---

## Best Practices

1. **Pagination**: Always use pagination for large result sets. Recommended limit: 10-20 items per page.
2. **Filtering**: Combine multiple filters for better search results.
3. **Error Handling**: Always handle error responses gracefully on the client side.
4. **Caching**: Cache featured packages and statistics for better performance.
5. **Rate Limiting**: API has rate limiting enabled for protection.
6. **Authentication**: Store JWT tokens securely and refresh before expiration.

---

## Rate Limiting

The API implements rate limiting to prevent abuse:
- 100 requests per 15 minutes per IP address
- Header information provided in response

---

## Changelog

### Version 1.0 (Current)
- Initial API release
- All endpoints implemented
- Full validation and error handling
- Comprehensive filtering and searching
