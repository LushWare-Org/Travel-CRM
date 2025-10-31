# Migration Guide: imgbb to Cloudinary

## Overview
This guide will help you migrate from imgbb to Cloudinary for image uploads.

## Changes Made

### Backend (Server)
✅ Cloudinary service created: `src/services/cloudinary.service.js`
✅ Upload controller created: `src/controllers/upload.controller.js`
✅ Upload routes created: `src/routes/upload.routes.js`
✅ Routes integrated in `src/server.js`

### Frontend (Management)
✅ Cloudinary service created: `src/services/cloudinaryService.js`

## Migration Steps

### Step 1: Update Your Image Upload Code

**Before (imgbb):**
```javascript
import { uploadImage, uploadMultipleImages } from '../services/imageService';

// Single image
const url = await uploadImage(file);

// Multiple images
const urls = await uploadMultipleImages(files, (progress) => {
  console.log(`${progress.current}/${progress.total}`);
});
```

**After (Cloudinary):**
```javascript
import { uploadImage, uploadPackageImages } from '../services/cloudinaryService';

// Single image with preset
const imageData = await uploadImage(file, 'package');
console.log(imageData.url); // Use the URL
console.log(imageData.publicId); // Store this for deletion

// Multiple images (for packages)
const urls = await uploadPackageImages(files, (progress) => {
  console.log(`${progress.current}/${progress.total}`);
});
```

### Step 2: Update Import Statements

Find and replace in your files:

```javascript
// Old
import { uploadImage } from './services/imageService';

// New
import { uploadImage } from './services/cloudinaryService';
```

### Step 3: Update Image Deletion Logic

**Add deletion when removing images:**
```javascript
import { deleteImage } from './services/cloudinaryService';

// When deleting a package/itinerary
const handleDelete = async (publicId) => {
  try {
    await deleteImage(publicId);
    Swal.fire('Success', 'Image deleted successfully', 'success');
  } catch (error) {
    Swal.fire('Error', 'Failed to delete image', 'error');
  }
};
```

### Step 4: Store publicId in Database

Update your models to store both URL and publicId:

```javascript
// Package model example
const packageData = {
  title: 'Amazing Tour',
  images: [
    {
      url: 'https://res.cloudinary.com/.../image.jpg',
      publicId: 'trip-sky-way/packages/abc123',
    }
  ]
};
```

### Step 5: Update Environment Variables

Create `.env.local` in Management folder:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

## API Endpoints Available

1. **POST** `/api/v1/upload/single` - Upload single image
2. **POST** `/api/v1/upload/multiple` - Upload multiple images
3. **POST** `/api/v1/upload/package` - Upload package images (optimized)
4. **POST** `/api/v1/upload/itinerary` - Upload itinerary images (optimized)
5. **POST** `/api/v1/upload/profile` - Upload profile image (optimized)
6. **DELETE** `/api/v1/upload/:publicId` - Delete single image
7. **POST** `/api/v1/upload/delete-multiple` - Delete multiple images
8. **GET** `/api/v1/upload/optimize` - Get optimized image URL

## Usage Examples

### Example 1: Package Image Upload

```javascript
import { uploadPackageImages } from './services/cloudinaryService';

const handleImageUpload = async (e) => {
  const files = e.target.files;
  
  try {
    const urls = await uploadPackageImages(files, (progress) => {
      console.log(`Uploading: ${progress.current}/${progress.total}`);
    });
    
    // urls is an array of image URLs
    setPackageImages([...packageImages, ...urls]);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### Example 2: Itinerary Image Upload

```javascript
import { uploadItineraryImages } from './services/cloudinaryService';

const handleImageUpload = async (files) => {
  try {
    const urls = await uploadItineraryImages(files, (progress) => {
      setUploadProgress((progress.current / progress.total) * 100);
    });
    
    return urls;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
```

### Example 3: Profile Image Upload

```javascript
import { uploadProfileImage } from './services/cloudinaryService';

const handleProfileUpload = async (file) => {
  try {
    const imageData = await uploadProfileImage(file);
    setProfileImage(imageData.url);
    setProfileImagePublicId(imageData.publicId); // Store for deletion
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### Example 4: Delete Image

```javascript
import { deleteImage } from './services/cloudinaryService';

const handleImageDelete = async (publicId) => {
  try {
    await deleteImage(publicId);
    Swal.fire('Success', 'Image deleted', 'success');
  } catch (error) {
    Swal.fire('Error', 'Failed to delete image', 'error');
  }
};
```

## Specific File Updates

### 1. Update `Management/src/features/itinerary/services/imageService.js`

Replace the entire file with:

```javascript
/**
 * Image upload service for itinerary
 * Now uses Cloudinary instead of imgbb
 */

export { 
  uploadImage,
  uploadMultipleImages as uploadItineraryImages,
  uploadItineraryImages as uploadMultiple,
  VALIDATION_MESSAGES 
} from '../../../services/cloudinaryService';
```

Or update your imports directly in the components.

### 2. Update Package Components

Find components that use image upload:
```bash
# Search for image upload usage
grep -r "uploadImage" Management/src/
```

Update each component to use the new service.

### 3. Update Forms

Ensure your forms have the correct field names:
- Single upload: `name="image"`
- Multiple upload: `name="images"`

## Testing

### Test Single Upload
```javascript
const testSingleUpload = async () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  
  input.onchange = async (e) => {
    const file = e.target.files[0];
    const result = await uploadImage(file, 'package');
    console.log('Uploaded:', result);
  };
  
  input.click();
};
```

### Test Multiple Upload
```javascript
const testMultipleUpload = async () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  
  input.onchange = async (e) => {
    const files = e.target.files;
    const urls = await uploadPackageImages(files, (progress) => {
      console.log(`Progress: ${progress.current}/${progress.total}`);
    });
    console.log('Uploaded URLs:', urls);
  };
  
  input.click();
};
```

## Benefits of Cloudinary

✅ **Better Performance** - CDN delivery, automatic optimization
✅ **Image Transformations** - Resize, crop, format conversion on-the-fly
✅ **Better Organization** - Folders and structured storage
✅ **Secure** - Authenticated uploads through your backend
✅ **Cost Effective** - Free tier includes 25GB storage + 25GB bandwidth
✅ **Advanced Features** - Face detection, AI-based cropping, etc.

## Rollback Plan

If you need to rollback to imgbb:

1. Keep the old `imageService.js` as `imageService.imgbb.js`
2. Switch imports back to the old service
3. Update environment variables back to imgbb

## Environment Variables

Make sure these are set in `Server/.env`:
```env
CLOUDINARY_CLOUD_NAME=dwzhs42tz
CLOUDINARY_API_KEY=733573364443375
CLOUDINARY_API_SECRET=PN8rawnDWqvtVZiLfsoWvU7uYo0
```

## Common Issues

### Issue 1: "Authentication required"
**Solution:** Ensure JWT token is stored in localStorage and valid.

### Issue 2: "Image upload failed"
**Solution:** Check Cloudinary credentials in `.env` file.

### Issue 3: CORS Error
**Solution:** Ensure CORS is configured in `Server/src/config/cors.js`.

### Issue 4: 413 Payload Too Large
**Solution:** Check `MAX_FILE_SIZE` in `.env` and increase if needed.

## Next Steps

1. ✅ Test single image upload
2. ✅ Test multiple image upload
3. ✅ Test image deletion
4. ✅ Update all components using image upload
5. ✅ Test package creation with images
6. ✅ Test itinerary creation with images
7. ✅ Remove imgbb dependencies (if not needed)
8. ✅ Update documentation

## Support

For detailed documentation, see:
- `Server/docs/CLOUDINARY_SETUP.md` - Full Cloudinary setup guide
- [Cloudinary Docs](https://cloudinary.com/documentation) - Official documentation

## Summary

The Cloudinary integration is ready to use! Key points:

1. **Backend**: Complete API endpoints at `/api/v1/upload/*`
2. **Frontend**: Service available at `src/services/cloudinaryService.js`
3. **Authentication**: All uploads require JWT token
4. **Presets**: Package, Itinerary, Profile, Thumbnail
5. **Features**: Upload, Delete, Optimize, Transform images

Start migrating your components one at a time, testing thoroughly after each change.
