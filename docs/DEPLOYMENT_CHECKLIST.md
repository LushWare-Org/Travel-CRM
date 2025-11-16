# Deployment Checklist - International Phone Numbers

## 📋 Pre-Deployment Verification

### Code Review
- [ ] Review `phoneUtils.js` for accuracy
- [ ] Verify country list is complete and correct
- [ ] Check phone validation patterns in schemas
- [ ] Confirm all imports are in place
- [ ] No console warnings or errors

### Testing (Local)
- [ ] Create user with Sri Lankan number (0768952480)
- [ ] Create user with US number ((234) 567-8900)
- [ ] Create user with international format (+94768952480)
- [ ] Edit user and change phone/country
- [ ] Delete user (should work as before)
- [ ] Search users by phone
- [ ] Verify database has E.164 format
- [ ] Check phoneCountry is stored

### Files Changed
- [ ] `Management/src/features/user-management/utils/phoneUtils.js` (NEW)
- [ ] `Management/src/features/user-management/components/WebsiteUsersManagement/WebsiteUsersManagement.jsx`
- [ ] `Management/src/services/websiteUser.service.js`
- [ ] `Server/src/validators/user.validator.js`
- [ ] `Server/src/models/user.model.js`

---

## 🚀 Deployment Steps

### Step 1: Backend Update (5 min)

```bash
# 1. Update files
# - user.validator.js (validation schemas)
# - user.model.js (phoneCountry default)

# 2. Verify changes
# - No syntax errors
# - Imports are correct

# 3. Restart backend server
# Example:
# Kill current process (Ctrl+C)
# npm start
# or
# npm run dev

# 4. Verify server started
# Check for "Server running on port 5000"
# Check for no validation errors
```

### Step 2: Frontend Update (5 min)

```bash
# 1. Add new files
# - Management/src/features/user-management/utils/phoneUtils.js

# 2. Update existing files
# - WebsiteUsersManagement.jsx
# - websiteUser.service.js

# 3. Install dependencies (if needed)
cd Management
npm install libphonenumber-js  # Should already be installed

# 4. Clear cache and restart
# Clear node_modules cache (if issues)
# npm cache clean --force

# 5. Start dev server
npm run dev

# 6. Verify in browser
# http://localhost:5173
# Navigate to Website Users
# Click "Add User"
# Check country dropdown appears
```

### Step 3: Basic Functionality Test (10 min)

- [ ] Open admin portal
- [ ] Click "Add User"
- [ ] See country dropdown with flags
- [ ] Select different countries
- [ ] Placeholders change for each country
- [ ] Enter phone number
- [ ] Submit form
- [ ] User created successfully
- [ ] Check API response (DevTools Network tab)
- [ ] Verify phone is in E.164 format

### Step 4: Database Verification (5 min)

```javascript
// Connect to MongoDB
mongo <connection_string>

// Check created user
db.users.findOne({email: "test@example.com"})

// Verify output:
{
  phone: "+94768952480",      // ✅ E.164 format
  phoneCountry: "LK",          // ✅ ISO code
  ...
}

// Check multiple countries
db.users.find({}).select({phone: 1, phoneCountry: 1}).limit(10)

// All should have:
// phone: "+XX..." format
// phoneCountry: 2-letter code
```

### Step 5: Production Deployment

- [ ] Tag release in Git
- [ ] Deploy backend
- [ ] Monitor server logs (5 min)
- [ ] Deploy frontend
- [ ] Verify in production
- [ ] Test with real users
- [ ] Monitor for errors

---

## ✅ Verification Checklist

### Frontend Verification
```
□ Country dropdown appears in Add User form
□ Country dropdown appears in Edit User form
□ Flags display correctly with countries
□ Placeholder changes when country changes
□ Phone field accepts input
□ Form validates on submit
□ Form shows error if phone invalid
□ Form submits successfully with valid phone
□ Success message appears
□ User appears in list
□ No JavaScript errors in console
```

### Backend Verification
```
□ Server starts without errors
□ No validation warnings in logs
□ POST /api/v1/users accepts request
□ Phone in E.164 format in request
□ phoneCountry in request
□ Response contains user object
□ User object has phone (E.164)
□ User object has phoneCountry
□ Database saves correctly
```

### Database Verification
```
□ User record exists
□ phone field has E.164 format (+XX...)
□ phoneCountry field has 2-letter code
□ Other fields unchanged
□ No null values
□ Can query by phone
□ Can query by country
```

### API Testing
```bash
# Test create user
curl -X POST http://localhost:5000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+94768952480",
    "phoneCountry": "LK",
    "password": "TestPass123",
    "role": "customer"
  }'

# Expected Response (201 Created):
{
  "status": "success",
  "data": {
    "id": "...",
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+94768952480",
    "phoneCountry": "LK",
    "role": "customer",
    "isActive": true,
    "createdAt": "2024-11-15T..."
  }
}

# If error, check:
# - Status code (should be 201 or 200)
# - Error message
# - Validation schema in user.validator.js
```

---

## 🔄 Rollback Plan (if needed)

### Immediate Rollback (under 15 min)
```bash
# Backend
git revert <commit>
npm start

# Frontend
git revert <commit>
npm install
npm run dev
```

### Data Safety
- ✅ No data loss
- ✅ All changes are additive
- ✅ Old users continue to work
- ✅ Safe to rollback

### Verification After Rollback
- [ ] Check old form works (no country selector)
- [ ] Can still create users
- [ ] Phone validation works as before
- [ ] Database access works

---

## 🐛 Troubleshooting

### Issue: "libphonenumber-js not found"
```bash
cd Management
npm install libphonenumber-js
npm run dev
```

### Issue: Country dropdown not showing
```
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+Shift+R)
3. Check console for errors (F12)
4. Restart dev server
5. Check phoneUtils.js is imported
```

### Issue: Phone validation fails
```
1. Ensure country is selected
2. Try using the placeholder format
3. Try entering full international number
4. Check console for validation errors
5. Verify libphonenumber-js is installed
```

### Issue: API returns 400 Bad Request
```
1. Check phone is in E.164 format
2. Check phoneCountry is 2-letter code
3. Verify JSON is valid
4. Check user.validator.js regex pattern
5. Look at error message in response
```

### Issue: Phone not saved in database
```
1. Check API response status (201 or 200?)
2. Check API response has user object
3. Verify mongoDB connection
4. Check user.model.js schema
5. Test query: db.users.findOne({email: "..."})
```

---

## 📞 Support Contacts

**Frontend Issues**:
- Check `Management/src/` files
- Review `phoneUtils.js` 
- Check browser console (F12)
- Review PHONE_TESTING_GUIDE.md

**Backend Issues**:
- Check `Server/src/validators/user.validator.js`
- Check `Server/src/models/user.model.js`
- Review server logs
- Test with curl/Postman

**Database Issues**:
- Connect to MongoDB directly
- Check user collection
- Verify phone format
- Check phoneCountry values

---

## 📊 Success Metrics

After deployment, verify:

| Metric | Expected | Actual |
|--------|----------|--------|
| Users can create with SL phone | ✅ Yes | ☐ |
| Users can create with US phone | ✅ Yes | ☐ |
| Phone saved in E.164 format | ✅ Yes | ☐ |
| Country saved with user | ✅ Yes | ☐ |
| No validation errors | ✅ None | ☐ |
| No console errors | ✅ None | ☐ |
| Edit users works | ✅ Yes | ☐ |
| Delete users works | ✅ Yes | ☐ |
| Search by phone works | ✅ Yes | ☐ |
| All tests pass | ✅ Yes | ☐ |

---

## 📝 Sign-Off

### Developer Sign-Off
```
Name: _____________________
Date: _____________________
Tests Passed: [ ] Yes [ ] No
Comments: _____________________________
```

### QA Sign-Off
```
Name: _____________________
Date: _____________________
Deployment Approved: [ ] Yes [ ] No
Comments: _____________________________
```

### DevOps Sign-Off
```
Name: _____________________
Date: _____________________
Production Ready: [ ] Yes [ ] No
Comments: _____________________________
```

---

## 📚 Documentation References

- INTERNATIONAL_PHONE_IMPLEMENTATION.md - Technical details
- PHONE_TESTING_GUIDE.md - Testing procedures
- QUICK_REFERENCE_PHONE.md - Quick reference guide
- IMPLEMENTATION_SUMMARY_PHONE.md - Summary and verification
- This file - Deployment checklist

---

## 🎯 Timeline

| Phase | Duration | Owner |
|-------|----------|-------|
| Pre-deployment review | 30 min | Dev Lead |
| Backend deployment | 10 min | DevOps |
| Frontend deployment | 10 min | DevOps |
| Testing | 30 min | QA |
| Monitoring | 24 hours | DevOps |
| **Total** | **~2 hours** | Team |

---

## 🔐 Security Checklist

- [ ] All inputs validated server-side
- [ ] No sensitive data in logs
- [ ] Phone stored securely (E.164 format)
- [ ] Country code not sensitive
- [ ] No CORS issues
- [ ] Authentication still required
- [ ] Authorization not changed
- [ ] No new vulnerabilities introduced

---

## 🎉 Go-Live Checklist

- [ ] All tests passed
- [ ] All documentation reviewed
- [ ] No open issues
- [ ] Team trained on new feature
- [ ] Support documentation updated
- [ ] Monitoring in place
- [ ] Rollback plan ready
- [ ] Go-live approved by manager

---

**Deployment Date**: _____________
**Deployed By**: _________________
**Approved By**: _________________
**Status**: [ ] Pending [ ] In Progress [ ] Complete [ ] Rolled Back

---

**Version**: 1.0  
**Last Updated**: November 15, 2024  
**Next Review**: Post-deployment  
