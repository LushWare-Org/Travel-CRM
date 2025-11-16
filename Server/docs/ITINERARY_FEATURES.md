# Itinerary Module - Features Documentation

## Overview
The Itinerary module provides comprehensive functionality for managing travel itineraries with industry-level best practices, including optimized forms with dropdown options and professional PDF generation with contact information.

---

## ✅ Implemented Features

### 1. **Create New Itinerary** ✓
- **Endpoint**: `POST /api/v1/itineraries`
- **Access**: Private (Admin, Staff)
- **Features**:
  - Create detailed day-by-day itinerary
  - Link to specific travel package
  - Validation for sequential day numbers
  - Automatic metadata calculation
  - Dropdown-optimized form fields

**Request Body Example**:
```json
{
  "package": "65abc123def456789",
  "days": [
    {
      "dayNumber": 1,
      "title": "Arrival in Mumbai",
      "description": "Welcome to Mumbai! Check-in at hotel and evening city tour.",
      "activities": ["Airport pickup", "Hotel check-in", "Gateway of India visit"],
      "accommodation": {
        "name": "Taj Mahal Palace",
        "type": "hotel",
        "rating": 5
      },
      "meals": {
        "breakfast": false,
        "lunch": false,
        "dinner": true
      },
      "transport": "car",
      "places": [
        {
          "name": "Gateway of India",
          "description": "Iconic monument overlooking Arabian Sea",
          "duration": "1 hour"
        }
      ]
    }
  ]
}
```

---

### 2. **Edit Itinerary** ✓
- **Endpoint**: `PUT /api/v1/itineraries/:id`
- **Access**: Private (Admin, Staff)
- **Features**:
  - Update entire itinerary or specific fields
  - Validation for data integrity
  - Automatic version increment
  - Metadata recalculation

---

### 3. **Delete Itinerary** ✓
- **Endpoint**: `DELETE /api/v1/itineraries/:id`
- **Access**: Private (Admin, Staff)
- **Features**:
  - Safe deletion with package reference cleanup
  - Automatic package itinerary field update

---

### 4. **Duplicate/Clone Itinerary** ✓
- **Endpoint**: `POST /api/v1/itineraries/:id/clone`
- **Access**: Private (Admin, Staff)
- **Features**:
  - Clone entire itinerary to another package
  - Preserves all day details, activities, and places
  - Automatic validation for target package

**Request Body**:
```json
{
  "targetPackageId": "65abc987def654321"
}
```

---

### 5. **Dropdown Options API** ✓ *(NEW)*
- **Endpoint**: `GET /api/v1/itineraries/dropdown-options`
- **Access**: Public
- **Purpose**: Provides standardized dropdown options for forms
- **Features**:
  - Accommodation types
  - Transport types
  - Meal options
  - Status options

**Response**:
```json
{
  "success": true,
  "data": {
    "accommodationTypes": [
      { "value": "hotel", "label": "Hotel" },
      { "value": "resort", "label": "Resort" },
      { "value": "guesthouse", "label": "Guesthouse" },
      { "value": "homestay", "label": "Homestay" },
      { "value": "camp", "label": "Camp" },
      { "value": "other", "label": "Other" }
    ],
    "transportTypes": [
      { "value": "flight", "label": "Flight" },
      { "value": "train", "label": "Train" },
      { "value": "bus", "label": "Bus" },
      { "value": "car", "label": "Car" },
      { "value": "boat", "label": "Boat" },
      { "value": "walk", "label": "Walk" },
      { "value": "other", "label": "Other" }
    ],
    "mealOptions": [
      { "value": "breakfast", "label": "Breakfast" },
      { "value": "lunch", "label": "Lunch" },
      { "value": "dinner", "label": "Dinner" }
    ],
    "statusOptions": [
      { "value": "draft", "label": "Draft" },
      { "value": "published", "label": "Published" },
      { "value": "archived", "label": "Archived" }
    ]
  }
}
```

---

### 6. **Download Itinerary as PDF** ✓ *(ENHANCED)*
- **Endpoint**: `GET /api/v1/itineraries/:id/pdf`
- **Access**: Public
- **Features**:
  - Professional multi-page PDF layout
  - Brand-consistent design
  - Comprehensive contact information
  - Clickable links and contacts

#### PDF Sections:

##### **Page 1: Cover Page**
- Company branding
- Package title and destination
- Package details (duration, category, price)
- **Contact information box with:**
  - 📧 Email (clickable mailto link)
  - 📞 Phone (clickable tel link)
  - 🌐 Website (clickable URL)
  - 📍 Office address

##### **Page 2: Package Overview**
- Description
- Highlights
- Quick facts

##### **Page 3+: Day-wise Itinerary**
For each day:
- Day title and description
- Activities checklist
- Places to visit with details
- Accommodation information
- Meals included
- Transport mode

##### **Inclusions & Exclusions Page**
- ✓ What's included
- ✗ What's not included

##### **Terms & Conditions Page**
- Detailed terms and policies

##### **Contact & Support Page** *(NEW)*
- **Get in Touch Section:**
  - Email with response time
  - Phone with working hours
  - WhatsApp link (clickable)
  - Website link
  - Office address

- **Social Media Links:**
  - Facebook
  - Instagram
  - Twitter
  - LinkedIn

- **24/7 Emergency Support:**
  - Emergency helpline number
  - Highlighted in red for visibility

##### **Footer on Every Page**
- Company name
- Website (clickable)
- Email (clickable)
- Phone (clickable)
- Page numbers

---

## 📚 Additional Endpoints

### Get All Itineraries
- **Endpoint**: `GET /api/v1/itineraries`
- **Access**: Public
- **Features**: Pagination, filtering, sorting

### Get Single Itinerary
- **Endpoint**: `GET /api/v1/itineraries/:id`
- **Access**: Public

### Get Itinerary by Package
- **Endpoint**: `GET /api/v1/itineraries/package/:packageId`
- **Access**: Public

### Preview Itinerary
- **Endpoint**: `GET /api/v1/itineraries/:id/preview`
- **Access**: Public
- **Purpose**: Formatted JSON preview for display

### Day Management
- **Add Day**: `POST /api/v1/itineraries/:id/days`
- **Update Day**: `PUT /api/v1/itineraries/:id/days/:dayNumber`
- **Delete Day**: `DELETE /api/v1/itineraries/:id/days/:dayNumber`

---

## 🎨 Design Best Practices Implemented

### PDF Design
1. **Brand Consistency**: Uses company colors throughout
2. **Visual Hierarchy**: Clear section headers with decorative elements
3. **Readability**: Proper spacing, font sizes, and color contrast
4. **Professional Layout**: Information boxes, icons, and structured content
5. **Accessibility**: Clickable links for easy contact
6. **Page Management**: Automatic page breaks for long content

### API Design
1. **RESTful**: Standard HTTP methods and status codes
2. **Validation**: Comprehensive input validation
3. **Error Handling**: Descriptive error messages
4. **Authentication**: Role-based access control
5. **Documentation**: Clear endpoint descriptions

### Form Optimization
1. **Dropdown Standardization**: Centralized options endpoint
2. **Data Consistency**: Enum validation in model and validators
3. **User Experience**: Label-value pairs for frontend consumption

---

## 🔐 Security Features

1. **Authentication Required**: Protected routes for create/edit/delete
2. **Role-Based Access**: Admin and Staff only for modifications
3. **Input Validation**: Express-validator for all inputs
4. **NoSQL Injection Prevention**: MongoDB sanitization
5. **XSS Protection**: Input sanitization

---

## 📱 Contact Information in PDF

The PDF now includes comprehensive contact information:

### Company Details
- **Name**: Trip Sky Way Travel & Tourism Pvt. Ltd.
- **Email**: info@tripskyway.com (clickable)
- **Phone**: +91 9876543210 (clickable)
- **WhatsApp**: +91 9876543210 (clickable)
- **Website**: www.tripskyway.com (clickable)
- **Address**: 123 Travel Street, Andheri West, Mumbai, Maharashtra 400001, India

### Social Media
- Facebook: facebook.com/tripskyway
- Instagram: instagram.com/tripskyway
- Twitter: twitter.com/tripskyway
- LinkedIn: linkedin.com/company/tripskyway

### Emergency Contact
- **24/7 Emergency Helpline**: +91 9876543210 (highlighted in red)

---

## 📊 Testing

### Test the Dropdown Options API
```bash
curl http://localhost:5000/api/v1/itineraries/dropdown-options
```

### Test PDF Generation
```bash
curl http://localhost:5000/api/v1/itineraries/:id/pdf --output itinerary.pdf
```

### Test Clone Itinerary
```bash
curl -X POST http://localhost:5000/api/v1/itineraries/:id/clone \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"targetPackageId": "TARGET_PACKAGE_ID"}'
```

---

## 🚀 Frontend Integration Guide

### Using Dropdown Options
```javascript
// Fetch dropdown options
const response = await fetch('/api/v1/itineraries/dropdown-options');
const { data } = await response.json();

// Use in select/dropdown
<select name="accommodationType">
  {data.accommodationTypes.map(option => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ))}
</select>
```

### Create Itinerary Form
```javascript
const createItinerary = async (formData) => {
  const response = await fetch('/api/v1/itineraries', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(formData)
  });
  return response.json();
};
```

### Download PDF
```javascript
const downloadPDF = async (itineraryId) => {
  const response = await fetch(`/api/v1/itineraries/${itineraryId}/pdf`);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `itinerary-${itineraryId}.pdf`;
  a.click();
};
```

---

## 📝 Notes for Production

### Update Contact Information
Before deploying to production, update the following in `itinerary.service.js`:

1. Replace placeholder phone numbers: `+91 9876543210`
2. Update email: `info@tripskyway.com`
3. Update website: `www.tripskyway.com`
4. Update office address
5. Update social media links
6. Update WhatsApp link

### Environment Variables
Consider moving contact information to environment variables:
```
COMPANY_NAME=Trip Sky Way
COMPANY_EMAIL=info@tripskyway.com
COMPANY_PHONE=+91XXXXXXXXXX
COMPANY_WEBSITE=www.tripskyway.com
COMPANY_ADDRESS=...
```

---

## ✅ Feature Checklist

- [x] Create new itinerary
- [x] Edit itinerary
- [x] Delete itinerary
- [x] Duplicate/Clone itinerary
- [x] Dropdown options API for optimized forms
- [x] PDF generation with proper layout
- [x] Contact information in PDF (cover page)
- [x] Clickable links in PDF (email, phone, website)
- [x] Contact & Support page in PDF
- [x] Social media links in PDF
- [x] Emergency contact information
- [x] Footer with contact info on all pages
- [x] Professional branding and design
- [x] Comprehensive validation
- [x] Role-based access control
- [x] Complete documentation

---

## 🎯 All Requirements Met!

Your itinerary module now includes:
1. ✅ Create with dropdown optimization
2. ✅ Edit with dropdown optimization
3. ✅ Delete functionality
4. ✅ Duplicate/Clone functionality
5. ✅ PDF with professional layout design
6. ✅ PDF includes comprehensive contact links
7. ✅ Industry-level best practices

The implementation follows REST API standards, includes proper validation, security, and provides an excellent user experience both for API consumers and PDF recipients.
