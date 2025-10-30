# Cloudinary Image Upload - Setup Guide

## Overview

This guide explains the Cloudinary image upload integration in the Trip Sky Way backend. The system provides a complete image management solution with upload, optimization, transformation, and deletion capabilities.

## Features

✅ **Single & Multiple Image Upload**
✅ **Preset-based Transformations** (Package, Itinerary, Profile images)
✅ **Automatic Image Optimization**
✅ **Image Deletion** (Single & Batch)
✅ **Secure Upload with Authentication**
✅ **Buffer Upload Support** (Direct upload without disk storage)
✅ **Automatic Local File Cleanup**
✅ **Thumbnail Generation**
✅ **Dynamic Image Transformation**

## Configuration

### 1. Environment Variables

Your `.env` file already contains the Cloudinary credentials:

```env
CLOUDINARY_CLOUD_NAME=dwzhs42tz
CLOUDINARY_API_KEY=733573364443375
CLOUDINARY_API_SECRET=PN8rawnDWqvtVZiLfsoWvU7uYo0
```

### 2. File Structure

```
Server/
├── src/
│   ├── config/
│   │   └── cloudinary.js          # Cloudinary configuration
│   ├── services/
│   │   └── cloudinary.service.js  # Image upload service
│   ├── controllers/
│   │   └── upload.controller.js   # Upload endpoints
│   ├── routes/
│   │   └── upload.routes.js       # Upload routes
│   └── middleware/
│       └── upload.js              # Multer middleware
```

## API Endpoints

All upload endpoints require authentication (JWT token).

### 1. Upload Single Image

```http
POST /api/v1/upload/single
Content-Type: multipart/form-data
Authorization: Bearer YOUR_JWT_TOKEN

Body:
- image: (file)
- preset: (optional) default|package|itinerary|profile|thumbnail
```

**Example Response:**
```json
{
  "status": "success",
  "data": {
    "image": {
      "url": "https://res.cloudinary.com/dwzhs42tz/image/upload/v1234567890/trip-sky-way/general/image.jpg",
      "publicId": "trip-sky-way/general/image",
      "width": 1200,
      "height": 800,
      "format": "jpg",
      "size": 245678
    }
  }
}
```

### 2. Upload Multiple Images

```http
POST /api/v1/upload/multiple
Content-Type: multipart/form-data
Authorization: Bearer YOUR_JWT_TOKEN

Body:
- images: (files, max 10)
- preset: (optional) default|package|itinerary|profile|thumbnail
```

**Example Response:**
```json
{
  "status": "success",
  "data": {
    "images": [
      {
        "url": "https://res.cloudinary.com/.../image1.jpg",
        "publicId": "trip-sky-way/general/image1",
        "width": 1200,
        "height": 800,
        "format": "jpg",
        "size": 245678
      },
      {
        "url": "https://res.cloudinary.com/.../image2.jpg",
        "publicId": "trip-sky-way/general/image2",
        "width": 1200,
        "height": 800,
        "format": "jpg",
        "size": 312456
      }
    ],
    "count": 2
  }
}
```

### 3. Upload Package Images

```http
POST /api/v1/upload/package
Content-Type: multipart/form-data
Authorization: Bearer YOUR_JWT_TOKEN

Body:
- images: (files, max 10)
```

Automatically applies package-specific transformations (1200x800, optimized).

### 4. Upload Itinerary Images

```http
POST /api/v1/upload/itinerary
Content-Type: multipart/form-data
Authorization: Bearer YOUR_JWT_TOKEN

Body:
- images: (files, max 10)
```

Automatically applies itinerary-specific transformations (1000x600, optimized).

### 5. Upload Profile Image

```http
POST /api/v1/upload/profile
Content-Type: multipart/form-data
Authorization: Bearer YOUR_JWT_TOKEN

Body:
- image: (file)
```

Automatically applies profile-specific transformations (400x400, face-centered).

### 6. Delete Image

```http
DELETE /api/v1/upload/:publicId
Authorization: Bearer YOUR_JWT_TOKEN
```

**Example:**
```http
DELETE /api/v1/upload/trip-sky-way%2Fpackages%2Fimage-name
```

Note: URL encode the publicId if it contains special characters.

### 7. Delete Multiple Images

```http
POST /api/v1/upload/delete-multiple
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN

Body:
{
  "publicIds": [
    "trip-sky-way/packages/image1",
    "trip-sky-way/packages/image2"
  ]
}
```

### 8. Get Optimized Image URL

```http
GET /api/v1/upload/optimize?publicId=trip-sky-way/packages/image&width=800&height=600&quality=auto&format=webp
```

**Query Parameters:**
- `publicId` (required): Cloudinary public ID
- `width` (optional): Desired width
- `height` (optional): Desired height
- `quality` (optional): Image quality (default: auto)
- `format` (optional): Image format (default: auto)

## Image Presets

### Default
- Folder: `trip-sky-way/general`
- Transformation: Auto quality and format

### Package
- Folder: `trip-sky-way/packages`
- Transformation: 1200x800, fill crop, auto quality

### Itinerary
- Folder: `trip-sky-way/itineraries`
- Transformation: 1000x600, fill crop, auto quality

### Profile
- Folder: `trip-sky-way/profiles`
- Transformation: 400x400, fill crop, face-centered, auto quality

### Thumbnail
- Folder: `trip-sky-way/thumbnails`
- Transformation: 300x200, fill crop, auto quality

## Frontend Integration

### React/JavaScript Example

```javascript
// Upload single image
const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('preset', 'package');

  try {
    const response = await fetch('http://localhost:5000/api/v1/upload/single', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${yourJwtToken}`,
      },
      body: formData,
    });

    const data = await response.json();
    console.log('Uploaded:', data.data.image.url);
    return data.data.image;
  } catch (error) {
    console.error('Upload failed:', error);
  }
};

// Upload multiple images
const uploadMultipleImages = async (files) => {
  const formData = new FormData();
  
  // Add all files to FormData
  for (let i = 0; i < files.length; i++) {
    formData.append('images', files[i]);
  }
  formData.append('preset', 'itinerary');

  try {
    const response = await fetch('http://localhost:5000/api/v1/upload/multiple', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${yourJwtToken}`,
      },
      body: formData,
    });

    const data = await response.json();
    console.log('Uploaded images:', data.data.images);
    return data.data.images;
  } catch (error) {
    console.error('Upload failed:', error);
  }
};

// Delete image
const deleteImage = async (publicId) => {
  const encodedPublicId = encodeURIComponent(publicId);
  
  try {
    const response = await fetch(
      `http://localhost:5000/api/v1/upload/${encodedPublicId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${yourJwtToken}`,
        },
      }
    );

    const data = await response.json();
    console.log('Deleted:', data.message);
  } catch (error) {
    console.error('Delete failed:', error);
  }
};
```

### React Component Example

```jsx
import React, { useState } from 'react';

const ImageUploader = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }
    formData.append('preset', 'package');

    try {
      const response = await fetch('http://localhost:5000/api/v1/upload/multiple', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      const data = await response.json();
      setUploadedImages(data.data.images);
      alert('Images uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {uploadedImages.map((image, index) => (
          <img
            key={index}
            src={image.url}
            alt={`Uploaded ${index}`}
            style={{ width: '200px', height: '150px', objectFit: 'cover' }}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageUploader;
```

## Service Functions

The `cloudinary.service.js` provides these functions:

```javascript
import * as cloudinaryService from '../services/cloudinary.service.js';

// Upload single image from file path
const result = await cloudinaryService.uploadImage(filePath, options);

// Upload multiple images
const results = await cloudinaryService.uploadMultipleImages(filePaths, options);

// Upload from buffer (no disk storage)
const result = await cloudinaryService.uploadImageFromBuffer(buffer, options);

// Delete image
await cloudinaryService.deleteImage(publicId);

// Delete multiple images
await cloudinaryService.deleteMultipleImages(publicIds);

// Get optimized URL
const url = cloudinaryService.getOptimizedImageUrl(publicId, {
  width: 800,
  height: 600,
  quality: 'auto',
  format: 'webp',
});

// Get thumbnail URL
const thumbnailUrl = cloudinaryService.getThumbnailUrl(publicId, 200);

// Upload with preset
const result = await cloudinaryService.uploadWithPreset(filePath, 'package');
```

## Testing with Postman/Thunder Client

1. **Set Authorization:**
   - Type: Bearer Token
   - Token: Your JWT token from login

2. **Upload Single Image:**
   - Method: POST
   - URL: `http://localhost:5000/api/v1/upload/single`
   - Body: form-data
     - Key: `image` (File)
     - Key: `preset` (Text) = `package`

3. **Upload Multiple Images:**
   - Method: POST
   - URL: `http://localhost:5000/api/v1/upload/multiple`
   - Body: form-data
     - Key: `images` (File) - Select multiple files
     - Key: `preset` (Text) = `itinerary`

## Error Handling

The system handles various errors:

- **400**: Missing file, invalid file type
- **401**: Unauthorized (missing/invalid token)
- **500**: Cloudinary upload/delete failure

**Example Error Response:**
```json
{
  "status": "error",
  "message": "Please upload an image",
  "statusCode": 400
}
```

## File Validation

- **Allowed Types**: `image/jpeg`, `image/png`, `image/jpg`, `application/pdf`
- **Max File Size**: 5MB (configurable via `MAX_FILE_SIZE` env variable)
- **Max Files**: 10 per request (configurable in routes)

## Best Practices

1. **Always use presets** for consistent image sizing
2. **Delete old images** when updating (to save storage)
3. **Use optimized URLs** for displaying images
4. **Store publicId** in database for easy deletion
5. **Handle upload errors** gracefully in frontend
6. **Show upload progress** for better UX
7. **Compress images** before upload when possible

## Security

- All upload endpoints require authentication
- File type validation prevents malicious uploads
- File size limits prevent abuse
- Cloudinary credentials secured in environment variables

## Troubleshooting

### Upload fails with 500 error
- Check Cloudinary credentials in `.env`
- Verify Cloudinary account is active
- Check upload folder permissions

### "Please upload an image" error
- Ensure field name matches (`image` for single, `images` for multiple)
- Check file is properly attached to request
- Verify Content-Type is `multipart/form-data`

### Authentication error
- Ensure JWT token is included in Authorization header
- Verify token is valid and not expired
- Check token format: `Bearer YOUR_TOKEN`

## Next Steps

1. Update your frontend to use these endpoints
2. Replace the existing imgbb implementation with Cloudinary
3. Test all upload scenarios
4. Implement image deletion when removing packages/itineraries
5. Add upload progress indicators

## Support

For issues or questions, refer to:
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- Project Server README
- Team documentation
