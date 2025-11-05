# Sales Rep Management - Quick Testing Guide

## 🧪 Testing Your Integration

### Prerequisites
- Backend running on `http://localhost:5000`
- Frontend running on `http://localhost:5173` (Vite)
- MongoDB instance connected
- Admin user logged in

---

## 📝 Test Cases

### Test 1: Create Sales Rep
**Objective**: Verify sales rep creation with email invitation

**Steps**:
1. Navigate to Sales Rep Management page
2. Click "Add Sales Rep" button
3. Fill in form:
   - Name: `John Doe`
   - Email: `john.doe@example.com`
   - Phone: `5551234567`
   - Commission Rate: `12`
4. Click "Create & Send Invitation"

**Expected Results**:
- ✅ Success toast: "✅ Sales rep created and invitation sent to john.doe@example.com"
- ✅ Dialog closes
- ✅ Table refreshes with new rep
- ✅ Stats update (total count +1)
- ✅ Email sent to rep's inbox
- ✅ Check backend logs for email confirmation

**Test Data**:
```
Name: John Doe
Email: john.doe@example.com
Phone: 5551234567
Commission: 12%
```

---

### Test 2: Email Validation
**Objective**: Verify email uniqueness constraint

**Steps**:
1. Try to create another sales rep with same email
2. Email: `john.doe@example.com` (existing)

**Expected Results**:
- ✅ Error toast: "This email is already in use."
- ✅ Dialog remains open
- ✅ Form data preserved
- ✅ Backend returns 409 Conflict

**Error Handling**:
```
POST /api/v1/sales-reps
Body: { email: "john.doe@example.com" }
Response: 409
{
  status: 'error',
  message: 'Email already exists',
  userMessage: 'This email is already in use.'
}
```

---

### Test 3: Phone Validation
**Objective**: Verify phone format validation (10 digits)

**Test Cases**:
```
✓ Valid:   5551234567
✓ Valid:   555-123-4567
✗ Invalid: 123 (too short)
✗ Invalid: 55512345678 (too long)
✗ Invalid: ABCDEFGHIJ (non-numeric)
```

**Steps**:
1. Try with invalid phone: `123`
2. Try with invalid phone: `55512345678`

**Expected Results**:
- ✅ Validation error before submission
- ✅ Frontend validation catches it
- ✅ Toast: "Phone number must be exactly 10 digits"

---

### Test 4: Commission Rate Validation
**Objective**: Verify commission rate bounds (0-100)

**Test Cases**:
```
✓ Valid:   0
✓ Valid:   50
✓ Valid:   100
✗ Invalid: -1 (negative)
✗ Invalid: 101 (over 100)
```

**Steps**:
1. Try commission: `-5`
2. Try commission: `150`

**Expected Results**:
- ✅ Frontend validation shows error
- ✅ Toast: "Commission rate must be between 0 and 100"

---

### Test 5: Edit Sales Rep
**Objective**: Verify sales rep update functionality

**Steps**:
1. Click edit icon on a sales rep row
2. Dialog opens with current data
3. Change:
   - Name: `Jane Doe`
   - Commission: `15`
4. Click "Update Sales Rep"

**Expected Results**:
- ✅ Success toast: "✅ Sales rep updated successfully"
- ✅ Dialog closes
- ✅ Table row updates immediately
- ✅ Stats update if status changed

**Before/After**:
```
Before: John Doe | 12% commission
After:  Jane Doe | 15% commission
```

---

### Test 6: Search & Filter
**Objective**: Verify search functionality

**Steps**:
1. Type in search box: `jane`
2. Press Enter or wait for debounce
3. Type: `doe@example.com`
4. Type: `555`

**Expected Results**:
- ✅ Table filters by name match
- ✅ Table filters by email match
- ✅ Table filters by phone match
- ✅ Pagination resets to page 1
- ✅ Results update in real-time

---

### Test 7: Delete Sales Rep
**Objective**: Verify deletion with confirmation

**Steps**:
1. Click delete icon (trash icon)
2. Confirmation dialog appears
3. Click "Cancel" first
4. Click delete icon again
5. Click "Delete" to confirm

**Expected Results**:
- ✅ First delete attempt: Dialog shows, nothing deleted
- ✅ After cancel: Dialog closes, rep still in table
- ✅ Second delete: Confirmation shown
- ✅ After confirm: Success toast, rep removed from table
- ✅ Stats update (total count -1)

---

### Test 8: Resend Invitation
**Objective**: Verify invitation resend for pending reps

**Steps**:
1. Find a recently created rep (status: "invited")
2. Click "Resend Invite" button
3. Confirmation dialog appears
4. Click "Resend"

**Expected Results**:
- ✅ Success toast: "✅ Invitation resent to email@example.com"
- ✅ Email sent to rep
- ✅ Table updates
- ✅ "Invitation sent" timestamp updates

---

### Test 9: Force Password Reset
**Objective**: Verify password reset functionality

**Steps**:
1. Click "Reset Password" button on a rep
2. Confirmation dialog appears
3. Click "Send Reset Email"

**Expected Results**:
- ✅ Success toast: "✅ Password reset email sent"
- ✅ Email received by rep
- ✅ Email contains reset link
- ✅ Rep status changes to "Password Reset Required"

---

### Test 10: Pagination
**Objective**: Verify pagination works correctly

**Steps**:
1. Create 15+ sales reps
2. Note page shows 10 items
3. Click "Next" button
4. Verify page 2 displays
5. Click "Previous" button
6. Verify page 1 redisplays

**Expected Results**:
- ✅ First page shows items 1-10
- ✅ Second page shows items 11+
- ✅ Pagination info displays correctly
- ✅ Search resets pagination to page 1

---

### Test 11: Stats Display
**Objective**: Verify statistics calculations

**Steps**:
1. Note initial stats
2. Create 5 new sales reps
3. Check stats update
4. Deactivate 2 sales reps
5. Check stats update again

**Expected Results**:
- ✅ Total count increases with each creation
- ✅ Active count updates when status changes
- ✅ Conversion rate stays accurate
- ✅ Earnings total reflects changes

---

### Test 12: Loading States
**Objective**: Verify UI feedback during operations

**Steps**:
1. Create a sales rep
2. Watch the button during submission
3. Watch table during load
4. Watch dialog during edit

**Expected Results**:
- ✅ Button shows "Creating..." text
- ✅ Button disabled during submission
- ✅ Loading spinner shows while fetching
- ✅ Inputs disabled during submission

---

### Test 13: Error Handling
**Objective**: Verify error scenarios

**Steps**:
1. Stop backend server
2. Try to create sales rep
3. Verify error message

**Expected Results**:
- ✅ Error banner appears at top
- ✅ Toast shows user-friendly message
- ✅ Console shows technical error
- ✅ Form remains open for retry

---

### Test 14: Navigation After Actions
**Objective**: Verify page navigation after operations

**Steps**:
1. Create new sales rep
2. Navigate to another page
3. Come back to Sales Rep page
4. Verify data persists

**Expected Results**:
- ✅ Data persists (not lost on navigation)
- ✅ Search/filter state maintained
- ✅ Current page maintained
- ✅ Stats updated

---

## 🔍 Browser Developer Tools Checks

### Console Tab
**Look for**:
- ✅ No JavaScript errors
- ✅ No 404 errors
- ✅ API calls in Network tab show 200/201 status
- ✅ Console.log messages show data flow

**Check API Calls**:
```
Network Tab → XHR/Fetch
POST /api/v1/sales-reps
GET  /api/v1/sales-reps
PUT  /api/v1/sales-reps/:id
DELETE /api/v1/sales-reps/:id
```

### Network Tab
**Check each call**:
1. **Request Headers**
   - ✅ Authorization header present
   - ✅ Content-Type: application/json
   - ✅ Origin header matches frontend URL

2. **Request Body**
   - ✅ Contains correct data
   - ✅ Data properly formatted

3. **Response**
   - ✅ Status: 200/201/400/409/500 as appropriate
   - ✅ Response body well-formed JSON
   - ✅ Message field explains result

---

## 📊 Backend Verification

### Check Database Records
```javascript
// MongoDB Shell
use tripskiway
db.users.find({ role: 'salesRep' }).pretty()

// Verify fields
{
  _id: ObjectId("..."),
  name: "John Doe",
  email: "john@example.com",
  role: "salesRep",
  commissionRate: 12,
  isActive: true,
  isEmailVerified: false,
  isTempPassword: true,
  mustChangePassword: true,
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### Check Email Logs
```bash
# Backend logs
tail -f logs/app.log | grep "email"

# Look for
[INFO] Sending invitation email to john@example.com
[INFO] Email sent successfully
[ERROR] Email sending failed: ...
```

### Check API Response Format
```javascript
// Example: Create Response
{
  status: 'success',
  data: {
    _id: '507f1f77bcf86cd799439011',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1-555-1234',
    role: 'salesRep',
    commissionRate: 12,
    isActive: true,
    isEmailVerified: false,
    isTempPassword: true,
    mustChangePassword: true,
    createdAt: '2024-10-22T10:30:00Z',
    updatedAt: '2024-10-22T10:30:00Z'
  },
  message: 'Sales representative created successfully'
}
```

---

## 🐛 Troubleshooting

### Issue: "No response from server"
**Diagnosis**:
- [ ] Backend server running?
- [ ] Correct API URL in `.env`?
- [ ] Network connectivity?

**Solution**:
```bash
# Backend
npm run dev
# Check port 5000 is listening

# Frontend - verify .env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

---

### Issue: Email not sending
**Diagnosis**:
- [ ] Email service configured?
- [ ] SMTP credentials correct?
- [ ] Backend logs show error?

**Solution**:
```bash
# Check backend .env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Backend logs
tail -f logs/app.log | grep -i email
```

---

### Issue: Duplicate email not rejected
**Diagnosis**:
- [ ] Backend validation missing?
- [ ] Database index missing?

**Solution**:
```javascript
// MongoDB - add unique index
db.users.createIndex({ email: 1 }, { unique: true })

// Verify index exists
db.users.getIndexes()
```

---

### Issue: Commission rate validation fails
**Diagnosis**:
- [ ] Value outside 0-100 range?
- [ ] Type is number, not string?

**Solution**:
```javascript
// Frontend - ensure type
const commissionRate = parseFloat(formData.commissionRate)
// Not string, must be number

// Backend - Joi should catch
commissionRate: Joi.number().min(0).max(100)
```

---

## ✅ Final Checklist

Before declaring testing complete:

- [ ] All 14 test cases passed
- [ ] No console errors
- [ ] No network errors (all 200/201/400/409)
- [ ] Database records created correctly
- [ ] Emails being sent and received
- [ ] Stats calculations accurate
- [ ] Search/filter working
- [ ] Pagination working
- [ ] Error messages user-friendly
- [ ] Loading states show correctly
- [ ] Disabled states work during submission
- [ ] Form validation working (frontend)
- [ ] Backend validation working (API errors)
- [ ] Navigation persists data
- [ ] Backend logs clean (no errors)

---

## 🎉 Testing Complete!

Once all tests pass, your Sales Rep Management integration is production-ready.

### Next Steps
1. Deploy backend changes
2. Deploy frontend changes
3. Monitor logs for errors
4. Collect user feedback
5. Plan performance metrics tracking
6. Plan commission calculation feature
