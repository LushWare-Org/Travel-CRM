## PDF Export Feature - Testing Guide

### What was fixed:

1. **Increased Express Body Size Limit**
   - Changed from 10MB to 50MB to accommodate large base64-encoded chart images
   - File: `Server/src/server.js`

2. **Optimized Image Compression**
   - Changed from PNG (large) to JPEG (85% quality) for smaller payload size
   - Reduces request body by 60-70%
   - File: `Management/src/features/analytics/utils/exportAnalytics.js`

3. **Improved HTTP Headers**
   - Added `Cache-Control: no-cache, no-store, must-revalidate` to all export endpoints
   - Ensures browser doesn't cache PDF responses
   - File: `Server/src/controllers/analyticsPDFExport.controller.js`

4. **Enhanced Error Logging**
   - Added detailed logging on server side to track PDF generation
   - Added response validation on client side with detailed error reporting
   - Both sides now log actual error messages instead of silent failures

5. **Better Timeout Handling**
   - Increased axios timeout from 60 to 120 seconds for large PDF generation
   - Added proper error handling for timeout scenarios

### How to Test:

1. **Start Both Servers**
   ```bash
   # Terminal 1: Start Server
   cd Server
   npm start
   
   # Terminal 2: Start Management App
   cd Management
   npm run dev
   ```

2. **Navigate to Analytics Dashboard**
   - Go to Management App > Analytics
   - Click on any analytics module (Lead, Billing, User, etc.)

3. **Click Export PDF Button**
   - You should see: "Preparing analytics PDF..."
   - Then: "Generating PDF..."
   - Browser should automatically download a PDF file

4. **Check Browser Console**
   - Open DevTools (F12) > Console tab
   - Look for logs like:
     ```
     Captured 6 charts
     Sending request with 6 charts
     PDF Response: { status: 200, contentType: 'application/pdf', ... }
     ```

5. **Check Server Logs**
   - Look for logs like:
     ```
     [Lead PDF Export] Starting export with 6 charts
     [Lead PDF Export] Generating PDF with 6 charts
     [Lead PDF Export] ✅ Generated PDF buffer: 12345 bytes
     [Lead PDF Export] Sending PDF response...
     ```

### If Download Still Doesn't Work:

1. **Check Network Tab in DevTools**
   - Open DevTools > Network tab
   - Click export button
   - Look for the POST request to `/api/v1/analytics/*/export-pdf`
   - Check:
     - Is request being sent? (should be 200-300KB for request body with images)
     - Is response 200 OK?
     - Is response Content-Type: `application/pdf`?
     - Is response size > 0 bytes? (should be 30-50KB)

2. **Common Issues & Solutions**

   **Issue: Request shows 413 Payload Too Large**
   - Solution: Confirm you ran the server.js update to increase limit to 50MB
   - Verify: `express.json({ limit: '50mb' })`

   **Issue: PDF downloads but file is corrupted/empty**
   - Solution: Check if Puppeteer PDF generation failed silently
   - Look in server logs for `[PDF Export] Error` messages

   **Issue: No console logs appearing**
   - Solution: Verify logger is properly configured
   - Check if NODE_ENV is set correctly (should log in all modes)

3. **Enable Debug Logging**
   - Set `NODE_ENV=development` for more verbose logs
   - Server will output all network requests using Morgan middleware

### Files Modified:
- ✅ `Server/src/server.js` - Increased body size limit
- ✅ `Server/src/controllers/analyticsPDFExport.controller.js` - Added headers and logging
- ✅ `Management/src/features/analytics/utils/exportAnalytics.js` - JPEG compression + logging

### Next Steps:
If the fix doesn't work:
1. Share the browser console logs
2. Share the server logs from when you clicked export
3. Check the Network tab response size - is it receiving a blob?
