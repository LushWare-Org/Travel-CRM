# Testing Guide - International Phone Numbers (Admin)

## Quick Start

1. **Navigate to Admin Management Portal**
   - Open: `http://localhost:5173` (or your admin portal URL)
   - Go to: Website Users Management section

2. **Click "Add User" button**

3. **Test Case: Create Sri Lankan User**

### Test Data

| Field | Value |
|-------|-------|
| Name | John Perera |
| Email | john.perera@example.com |
| Country | 🇱🇰 LK |
| Phone | 768952480 or 0768952480 or +94768952480 |
| Password | TestPass123 |

### Expected Results

✅ **Phone accepts all formats:**
- `768952480` (local without leading 0)
- `0768952480` (local with leading 0)  
- `+94768952480` (international)

✅ **API receives E.164 format:**
```json
{
  "phone": "+94768952480",
  "phoneCountry": "LK"
}
```

✅ **User created successfully**

---

## Test Cases by Country

### Test Case 1: United States
```
Country: 🇺🇸 US
Phone Input: (234) 567-8900
Expected API: "+12345678900"
Status: ✅ Should succeed
```

### Test Case 2: United Kingdom
```
Country: 🇬🇧 GB
Phone Input: 20 7946 0958 (London)
Expected API: "+442079460958"
Status: ✅ Should succeed
```

### Test Case 3: India
```
Country: 🇮🇳 IN
Phone Input: 98765 43210
Expected API: "+919876543210"
Status: ✅ Should succeed
```

### Test Case 4: Pakistan
```
Country: 🇵🇰 PK
Phone Input: 300 2222222
Expected API: "+923002222222"
Status: ✅ Should succeed
```

### Test Case 5: Canada
```
Country: 🇨🇦 CA
Phone Input: (416) 555-0123
Expected API: "+14165550123"
Status: ✅ Should succeed
```

### Test Case 6: Australia
```
Country: 🇦🇺 AU
Phone Input: 2 1234 5678 (Sydney)
Expected API: "+61212345678"
Status: ✅ Should succeed
```

---

## Negative Test Cases (Should Fail)

### ❌ Invalid Format
```
Country: 🇺🇸 US
Phone Input: "123"
Expected: Error message "Please provide a valid phone number..."
Status: Should show validation error
```

### ❌ Missing Phone
```
Country: 🇺🇸 US
Phone Input: ""
Expected: Error message "All fields are required"
Status: Should show validation error
```

### ❌ Invalid for Country
```
Country: 🇱🇰 LK
Phone Input: "+12345678900" (US number)
Note: May or may not fail depending on libphonenumber-js config
Expected: Might accept (E.164 is flexible)
Status: Dependent on library behavior
```

---

## Verification in Database

After creating a user, verify in MongoDB:

```javascript
db.users.findOne({email: "john.perera@example.com"})
```

Expected output:
```json
{
  "_id": ObjectId("..."),
  "name": "John Perera",
  "email": "john.perera@example.com",
  "phone": "+94768952480",
  "phoneCountry": "LK",
  "role": "customer",
  "isActive": true,
  "createdAt": ISODate("2024-11-15T..."),
  ...
}
```

---

## Verification in API Response

**Request:**
```bash
POST /api/v1/users
{
  "name": "John Perera",
  "email": "john.perera@example.com",
  "phone": "+94768952480",
  "phoneCountry": "LK",
  "password": "TestPass123",
  "role": "customer"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Perera",
    "email": "john.perera@example.com",
    "phone": "+94768952480",
    "phoneCountry": "LK",
    "role": "customer",
    "isActive": true,
    "createdAt": "2024-11-15T10:30:00Z"
  }
}
```

---

## Testing with Browser DevTools

1. **Open DevTools** (F12)
2. **Go to Network tab**
3. **Create a user in admin panel**
4. **Find POST request** to `/api/v1/users`
5. **Check Request body**:
   - Should contain `"phone": "+94768952480"`
   - Should contain `"phoneCountry": "LK"`
6. **Check Response**:
   - Status code: `201` (Created)
   - Body contains full user object

---

## Common Issues & Solutions

### Issue: "libphonenumber-js not found"
**Solution:**
```bash
cd Management
npm install libphonenumber-js
npm run dev
```

### Issue: Country dropdown not showing
**Solution:**
- Ensure `phoneUtils.js` is imported correctly
- Check if COUNTRIES array is being imported
- Verify no console errors in DevTools

### Issue: Phone validation failing
**Solution:**
- Make sure you're using valid phone format for the country
- Check libphonenumber-js supports that country
- Try using the provided placeholder format

### Issue: "Phone is required" error on backend
**Solution:**
- Make sure phone field is not empty
- Verify phone is being sent in E.164 format from frontend
- Check API request in Network tab

---

## Debugging Tips

### 1. Check Frontend Formatting
```javascript
// In browser console:
import { formatPhoneToE164 } from './phoneUtils'
formatPhoneToE164("768952480", "LK")
// Should output: { e164: "+94768952480", ... }
```

### 2. Check API Response
```javascript
// In Network tab, click request:
// Look for Response headers:
// Content-Type: application/json
// Status: 201 Created

// Look for Response body:
{
  "status": "success",
  "data": { ... }
}
```

### 3. Check Database
```bash
# In MongoDB CLI:
db.users.find({phoneCountry: "LK"}).pretty()
# Should show all Sri Lankan users with correct format
```

---

## Regression Testing

Test these to ensure no regressions:

### 1. **Edit Existing User**
- Change phone number
- Change country
- Verify update works with E.164 format

### 2. **Search Users by Phone**
- Create user with international number
- Search by phone in admin panel
- Should find the user

### 3. **Delete User**
- Should still work as before
- No issues with phone format

### 4. **Filter by Status**
- Active/Inactive filter should work
- Phone format changes should not affect filtering

---

## Success Criteria

✅ User can create website user from admin panel with international phone  
✅ Phone numbers accepted in multiple formats (with/without country code)  
✅ Phone stored in E.164 format in database  
✅ Phone country stored as ISO country code  
✅ API validation accepts valid international numbers  
✅ API validation rejects invalid numbers  
✅ Error messages are helpful  
✅ No console errors  
✅ Edit/update flows work with phones  
✅ Database contains correct formats  

---

## Support

For issues or questions:
1. Check browser console for errors (F12)
2. Check API response in Network tab
3. Verify database records directly
4. Review validation schemas in `user.validator.js`
5. Review phone utils in `phoneUtils.js`
