# Cloudinary Upload Diagnostic Guide

## Check Server Terminal NOW

Look at your Server terminal (where `npm run dev` is running). When you try to upload, you should see logs. 

### What to Look For:

#### ✅ Good Startup (Server is configured correctly):
```
[Cloudinary Config] Cloud Name: dwzhs42tz
[Cloudinary Config] API Key: 733573...
[Cloudinary Config] API Secret: SET
Server running on http://localhost:5000
```

#### ❌ Bad Startup (Environment not loaded):
```
[Cloudinary Config] Cloud Name: NOT SET
[Cloudinary Config] API Key: NOT SET
[Cloudinary Config] API Secret: NOT SET
```

If you see "NOT SET", the fix didn't apply. Try this:
```powershell
cd Server
# Kill any node processes
taskkill /F /IM node.exe
# Start fresh
npm run dev
```

### When Upload Fails:

Look for these logs in Server terminal:

#### Common Error 1: No files received
```
[Upload Controller] Package images upload request received
[Upload Controller] Files: 0  ← PROBLEM!
```
**Fix**: Check that input field name is `images` (plural)

#### Common Error 2: Cloudinary credentials invalid
```
[Cloudinary] Upload error: Error: Invalid API Key
[Cloudinary] Error details: { http_code: 401 }
```
**Fix**: Double-check `.env` file has correct credentials

#### Common Error 3: File path issues
```
[Cloudinary] Uploading file: uploads/...
Error: ENOENT: no such file or directory
```
**Fix**: Create uploads directory:
```powershell
cd Server
mkdir uploads
```

#### Common Error 4: Multer not working
```
[Upload Controller] Files: undefined
TypeError: Cannot read property 'length' of undefined
```
**Fix**: Check routes use correct middleware

## Quick Test

### Test 1: Check Server is Running
Open browser: http://localhost:5000/health

Should see:
```json
{
  "status": "success",
  "message": "Server is running"
}
```

### Test 2: Check Auth
In browser console:
```javascript
console.log('Token:', localStorage.getItem('token'));
```

Should show a long JWT token, not `null`.

### Test 3: Check Upload Endpoint (with Postman)

1. Login first:
```http
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@tripskyway.dev",
  "password": "DevAdmin@2025"
}
```

2. Copy the token from response

3. Test upload:
```http
POST http://localhost:5000/api/v1/upload/package
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: multipart/form-data

Body (form-data):
- images: [select a small image file]
```

### Test 4: Check Cloudinary Directly

Run this in Server directory:
```powershell
node src/scripts/testCloudinary.js
```

Should show:
```
✅ All tests passed! Cloudinary is ready to use.
```

## Still Not Working?

### Share These Details:

1. **Server startup logs** (first 20 lines after running `npm run dev`)
2. **Error logs** from server terminal when you try to upload
3. **Network request details** from browser DevTools:
   - Request URL
   - Request Headers (especially Authorization)
   - Request Payload (is there file data?)
   - Response status and body

### Emergency Reset:

```powershell
# Stop everything
taskkill /F /IM node.exe

# Server
cd Server
rm -r node_modules
rm package-lock.json
npm install
npm run dev

# In another terminal - Management
cd Management  
rm -r node_modules
rm package-lock.json
npm install
npm run dev
```

## Most Likely Issues:

1. **Server not restarted** after code changes
2. **JWT token expired** - logout and login again
3. **Uploads folder missing** - create it manually
4. **Cloudinary config loaded before dotenv** - we fixed this
5. **CORS issue** - check Management URL in Server/src/config/cors.js

Check your **Server terminal RIGHT NOW** and tell me what you see!
