# Cloudinary Image Upload - Testing Guide

## Quick Start

The Cloudinary image upload feature has been integrated into your package management system. Here's how to test it:

## Prerequisites

1. **Server is running** on `http://localhost:5000`
2. **Management app is running** on `http://localhost:5174`
3. **You're logged in** with valid JWT token

## Testing Steps

### 1. Test Single Image Upload

1. Navigate to **Itinerary/Packages** section
2. Click **"+ New Package"** button
3. Fill in basic package information:
   - Package Name
   - Category
   - Destination
   - Description
4. Scroll to the **Images** section
5. Click **"Click to upload images"** area
6. Select 1-3 images from your computer
7. Watch for:
   - ✅ Upload progress indicator
   - ✅ Images appear with temporary URL first
   - ✅ Images update with Cloudinary URL
   - ✅ Success message appears

### 2. Test Multiple Image Upload

1. In the same form, click upload again
2. Select 5-10 images at once
3. Verify:
   - ✅ All images start uploading
   - ✅ Progress indicator shows
   - ✅ All images replace with Cloudinary URLs
   - ✅ Success message shows count

### 3. Test Image Removal

1. Hover over any uploaded image
2. Click the red trash icon
3. Verify:
   - ✅ Image is removed from display
   - ✅ Other images remain intact

### 4. Test Edit Package Images

1. Save the package with images
2. Find the package in the grid
3. Click **"Edit"** button
4. Scroll to Images section
5. Verify:
   - ✅ Existing images are displayed
   - ✅ You can add more images
   - ✅ You can remove existing images
6. Save changes
7. Verify images persist correctly

### 5. Test Image Display in Views

1. Click **"View"** on a package with images
2. Verify:
   - ✅ All images display correctly
   - ✅ Images are from Cloudinary (check URL)
   - ✅ Images load fast

### 6. Test Package Card Images

1. Look at package cards in grid view
2. Verify:
   - ✅ First image shows as card background
   - ✅ Image loads properly
   - ✅ Fallback icon shows if no images

## Expected Behavior

### Upload Process
```
1. User selects files
2. Temporary URLs show immediately (instant feedback)
3. Files upload to Cloudinary via backend API
4. Temporary URLs replace with Cloudinary URLs
5. Success notification appears
```

### Image URLs
All uploaded images should have URLs like:
```
https://res.cloudinary.com/dwzhs42tz/image/upload/v1234567890/trip-sky-way/packages/abc123.jpg
```

### Upload Limits
- **Max file size**: 5MB per image
- **Max files per upload**: 10 images at once
- **Allowed formats**: JPEG, PNG, JPG

## Testing with Different Scenarios

### Scenario 1: Large Files
1. Try uploading a 6MB+ file
2. Expected: Error message about file size

### Scenario 2: Invalid File Type
1. Try uploading a PDF or TXT file
2. Expected: Error message about file type

### Scenario 3: Network Error
1. Stop the server
2. Try uploading images
3. Expected: Clear error message
4. Restart server and verify form is still intact

### Scenario 4: Multiple Packages
1. Create 3 different packages with different images
2. Verify each package has its own images
3. Edit each package and verify correct images load

## Troubleshooting

### Images not uploading?

**Check:**
1. Are you logged in? (JWT token in localStorage)
2. Is the server running on port 5000?
3. Check browser console for errors
4. Check Network tab for API calls to `/api/v1/upload/package`

**Solution:**
```javascript
// Open browser console and check
console.log('Token:', localStorage.getItem('token'));
console.log('API URL:', import.meta.env.VITE_API_URL);
```

### Images show temporarily then disappear?

**Cause:** Upload failed but temporary URL was shown

**Check:**
1. Server logs for Cloudinary errors
2. Network tab for 500/400 errors
3. Cloudinary credentials in Server/.env

### "Authentication required" error?

**Solution:**
1. Login again to get fresh token
2. Check token expiration (7 days by default)
3. Verify token is saved in localStorage

### Images not showing in edit mode?

**Check:**
1. Package data structure has `images` array
2. URLs are valid and accessible
3. Check console for loading errors

## API Testing with Postman

### 1. Get Auth Token
```http
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@tripskyway.dev",
  "password": "DevAdmin@2025"
}
```

Copy the token from response.

### 2. Test Single Image Upload
```http
POST http://localhost:5000/api/v1/upload/single
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: multipart/form-data

Body (form-data):
- image: [select file]
- preset: package
```

### 3. Test Multiple Image Upload
```http
POST http://localhost:5000/api/v1/upload/package
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: multipart/form-data

Body (form-data):
- images: [select multiple files]
```

### 4. Test Image Deletion
```http
DELETE http://localhost:5000/api/v1/upload/trip-sky-way%2Fpackages%2Fimage-name
Authorization: Bearer YOUR_TOKEN_HERE
```

## Browser DevTools Testing

### 1. Check Network Requests
1. Open DevTools (F12)
2. Go to Network tab
3. Upload an image
4. Look for:
   - `POST /api/v1/upload/package` request
   - Status: 200
   - Response has `data.images` array

### 2. Check Console Logs
1. Open Console tab
2. Upload images
3. Look for:
   - "Upload progress: X/Y" messages
   - No red error messages
   - Success notifications

### 3. Check Application Storage
1. Open Application tab
2. Go to Local Storage
3. Check `token` exists and is valid

## Performance Testing

### Test Upload Speed
1. Upload 10 images
2. Time how long it takes
3. Expected: ~2-5 seconds per image

### Test Large Upload
1. Upload 10 images of 3-4MB each
2. Monitor memory usage
3. Verify no browser freezing

## Visual Testing Checklist

- [ ] Images display in correct aspect ratio
- [ ] Hover effects work on image cards
- [ ] Delete button appears on hover
- [ ] Image numbers show correctly
- [ ] Upload button disables during upload
- [ ] Progress indicator shows during upload
- [ ] Success/error messages display properly
- [ ] Empty state shows when no images
- [ ] Grid layout is responsive
- [ ] Images don't overflow containers

## Integration Testing

### Full Package Creation Flow
1. Start: Click "New Package"
2. Fill all required fields
3. Upload 5 images
4. Create itinerary (3 days)
5. Save as Draft
6. Edit package
7. Add 2 more images
8. Remove 1 image
9. Publish package
10. View package details
11. Verify all 6 images show correctly

## Production Readiness Checklist

Before deploying to production:

- [ ] Cloudinary credentials are set in production .env
- [ ] File size limits are appropriate
- [ ] Rate limiting is configured
- [ ] Error handling is comprehensive
- [ ] Images are optimized (format, quality)
- [ ] CDN is working properly
- [ ] Image deletion is working
- [ ] Backup strategy is in place
- [ ] Monitoring is set up

## Common Issues & Solutions

### Issue 1: "Failed to upload image"
**Cause:** Cloudinary credentials invalid
**Fix:** Check Server/.env has correct credentials

### Issue 2: Images upload but don't display
**Cause:** CORS issue
**Fix:** Check Server/src/config/cors.js includes Management URL

### Issue 3: Slow upload speed
**Cause:** Large file sizes
**Fix:** 
- Compress images before upload
- Lower max file size limit
- Use image optimization tools

### Issue 4: Images disappear after page refresh
**Cause:** Not saving to database
**Fix:** Verify package save includes images array

## Success Criteria

✅ Images upload successfully to Cloudinary
✅ Upload progress is visible to user
✅ Images persist after save
✅ Images display in all views
✅ Image deletion works
✅ Error messages are clear
✅ No console errors
✅ Performance is acceptable
✅ Mobile responsive
✅ Accessible (keyboard navigation, screen readers)

## Next Steps

After successful testing:

1. ✅ Document any issues found
2. ✅ Test on different browsers (Chrome, Firefox, Safari)
3. ✅ Test on mobile devices
4. ✅ Test with slow network (throttling)
5. ✅ Load test with many images
6. ✅ Security audit
7. ✅ User acceptance testing

## Support

If you encounter issues:

1. Check browser console for errors
2. Check server logs
3. Review CLOUDINARY_SETUP.md
4. Review CLOUDINARY_MIGRATION_GUIDE.md
5. Check Network tab in DevTools

## Example Test Data

Use these test images for consistent testing:
- Landscape: 1920x1080px
- Portrait: 1080x1920px
- Square: 1000x1000px
- Small: 800x600px
- Large: 3000x2000px

Good luck with testing! 🚀
