# Cloudinary Image Upload - Error Fix Guide

## Error: "Failed to upload image to Cloudinary" (500 Internal Server Error)

### Quick Diagnosis

Run this test to check Cloudinary connection:

```powershell
cd Server
node src/scripts/testCloudinary.js
```

### Common Causes & Solutions

#### 1. Missing or Invalid Cloudinary Credentials

**Symptom:** Server logs show "NOT SET" for credentials

**Check:**
```powershell
cd Server
cat .env | Select-String CLOUDINARY
```

**Fix:**
Ensure your `Server/.env` has these variables:
```env
CLOUDINARY_CLOUD_NAME=dwzhs42tz
CLOUDINARY_API_KEY=733573364443375
CLOUDINARY_API_SECRET=PN8rawnDWqvtVZiLfsoWvU7uYo0
```

**Then restart the server:**
```powershell
# Stop the server (Ctrl+C in the terminal)
# Start it again
npm run dev
```

#### 2. Uploads Directory Missing

**Fix:**
```powershell
cd Server
mkdir uploads -Force
```

#### 3. Multer Not Receiving Files

**Check server logs for:**
- "Files: 0" (means no files uploaded)
- Check network tab: files are in the request

**Fix:** Ensure form field name is `images` (not `image`)

Frontend:
```javascript
formData.append('images', file); // ✅ Correct for /upload/package
```

#### 4. CORS Issue

**Check:** Browser console shows CORS error

**Fix:** Update `Server/src/config/cors.js`:
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174', // ✅ Add Management app URL
];
```

### Step-by-Step Debugging

#### Step 1: Check Server Startup Logs

When you start the server, you should see:
```
[Cloudinary Config] Cloud Name: dwzhs42tz
[Cloudinary Config] API Key: 733573...
[Cloudinary Config] API Secret: SET
```

If you see "NOT SET", fix your .env file.

#### Step 2: Check Upload Request

When you upload images, server logs should show:
```
[Upload Controller] Package images upload request received
[Upload Controller] Files: 2
[Upload Controller] File path: uploads/images-1234567890-123456789.jpg
[Cloudinary] Uploading file: uploads/images-1234567890-123456789.jpg
[Cloudinary] Upload successful: trip-sky-way/packages/abc123
```

#### Step 3: Check Cloudinary Response

If upload fails, check the detailed error:
```
[Cloudinary] Upload error: Error: ...
[Cloudinary] Error details: { message: '...', http_code: 401 }
```

Common errors:
- **401**: Invalid API key/secret
- **400**: Invalid file or format
- **420**: Rate limit exceeded
- **500**: Cloudinary server error

### Manual Test with Postman

#### 1. Get Auth Token

```http
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@tripskyway.dev",
  "password": "DevAdmin@2025"
}
```

Copy the token.

#### 2. Test Upload

```http
POST http://localhost:5000/api/v1/upload/package
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

Body (form-data):
- images: [Select image file(s)]
```

Expected Response:
```json
{
  "status": "success",
  "data": {
    "images": [
      {
        "url": "https://res.cloudinary.com/...",
        "publicId": "trip-sky-way/packages/...",
        "width": 1200,
        "height": 800,
        "format": "jpg",
        "size": 245678
      }
    ],
    "count": 1
  }
}
```

### Frontend Debugging

#### Check Request in Browser DevTools

1. Open DevTools (F12)
2. Go to Network tab
3. Try uploading
4. Find the request to `/api/v1/upload/package`

**Check:**
- ✅ Status: Should be 200 (not 500)
- ✅ Request Headers: Has `Authorization: Bearer ...`
- ✅ Request Payload: Has `images` field with file data
- ✅ Response: Has `data.images` array

#### Check Console Logs

Should see:
```
Upload progress: 1/2
Upload progress: 2/2
```

If you see error:
```
Package images upload error: Error: Failed to upload image to Cloudinary
```

This means backend upload failed. Check server logs.

### Environment Variable Check

Make sure your `.env` file is:
1. In the `Server` directory (not root)
2. Named exactly `.env` (not `.env.txt`)
3. Has no quotes around values:
   ```env
   # ✅ Correct
   CLOUDINARY_CLOUD_NAME=dwzhs42tz
   
   # ❌ Wrong
   CLOUDINARY_CLOUD_NAME="dwzhs42tz"
   ```

### Restart Everything

If all else fails:

1. **Stop the server** (Ctrl+C)
2. **Clear node modules cache:**
   ```powershell
   cd Server
   rm -r node_modules
   rm package-lock.json
   npm install
   ```
3. **Verify .env file:**
   ```powershell
   cat .env | Select-String CLOUDINARY
   ```
4. **Start server:**
   ```powershell
   npm run dev
   ```
5. **Check startup logs** for Cloudinary config
6. **Try upload again**

### Test Cloudinary Connection Directly

Create a test file `test-upload.js`:

```javascript
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Test by uploading a sample image URL
cloudinary.uploader
  .upload('https://via.placeholder.com/300', {
    folder: 'trip-sky-way/test',
  })
  .then((result) => {
    console.log('✅ Upload successful!');
    console.log('URL:', result.secure_url);
    
    // Clean up test image
    return cloudinary.uploader.destroy(result.public_id);
  })
  .then(() => {
    console.log('✅ Test complete!');
  })
  .catch((error) => {
    console.error('❌ Upload failed:', error);
  });
```

Run: `node test-upload.js`

### Still Not Working?

1. **Check Cloudinary Dashboard:**
   - Go to https://cloudinary.com/console
   - Verify account is active
   - Check API credentials match `.env`

2. **Check Network:**
   - Can you access https://api.cloudinary.com?
   - Firewall blocking requests?

3. **Check Cloudinary Free Tier Limits:**
   - 25GB storage
   - 25GB bandwidth/month
   - If exceeded, uploads will fail

4. **Contact Support:**
   - Check server logs
   - Check browser console
   - Provide error messages
   - Share network request details

### Success Checklist

After fixing, verify:

- [ ] Server starts without Cloudinary errors
- [ ] Can upload single image
- [ ] Can upload multiple images
- [ ] Images show Cloudinary URLs
- [ ] Images persist after page refresh
- [ ] Edit mode shows existing images
- [ ] No console errors

### Quick Reference

**Server Logs Location:** Terminal where `npm run dev` is running

**Frontend Logs:** Browser DevTools Console (F12)

**Cloudinary Dashboard:** https://cloudinary.com/console

**Test Script:** `node src/scripts/testCloudinary.js`

### Need Help?

If you're still stuck:
1. Share server startup logs
2. Share error from browser console
3. Share network request details
4. Verify .env file contents (without secrets)
