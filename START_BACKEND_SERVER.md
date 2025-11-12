# 🚀 How to Start the Backend Server - Step by Step

## The Problem
**Error:** `net::ERR_CONNECTION_REFUSED` on `http://localhost:5001`

**Cause:** Backend server is not running. You need to start it!

---

## ✅ Solution: Start Backend Server

### **Option 1: Quick Start (Recommended)**

**Step 1: Open PowerShell**
- Press `Win + X` and select "Windows PowerShell"
- Or click Start menu → type "PowerShell"

**Step 2: Navigate to Server directory**
```powershell
cd "c:\Users\Anuradha\Downloads\Moratuwa Academic\Projects\Trypskyway\Trip-Sky-Way\Server"
```

**Step 3: Start the server**
```powershell
npm start
```

**Step 4: Wait for startup message**
You should see:
```
🚀 Server is running on http://localhost:5001
```

✅ **Server is now running!**

---

### **Option 2: Development Mode (with auto-reload)**

```powershell
cd "c:\Users\Anuradha\Downloads\Moratuwa Academic\Projects\Trypskyway\Trip-Sky-Way\Server"
npm run dev
```

This uses `nodemon` to auto-reload when you make changes to the code.

---

## 🔍 Verify Server is Running

### **Method 1: Using Browser**
1. Open your browser
2. Go to: `http://localhost:5001/health`
3. You should see:
```json
{
  "status": "success",
  "message": "Server is running",
  "timestamp": "2025-11-12T10:30:00.000Z",
  "environment": "development"
}
```

### **Method 2: Using PowerShell**
```powershell
Invoke-WebRequest http://localhost:5001/health
```

If successful, you'll see the response above.

---

## 📊 Terminal Arrangement (Two Terminals)

### **Terminal 1 - Backend Server**
```powershell
# Terminal 1
cd Server
npm start

# Output:
# 🚀 Server running on http://localhost:5001
```

### **Terminal 2 - Frontend**
```powershell
# Terminal 2
cd Client
npm run dev

# Output:
# ➜  Local:   http://localhost:5173/
```

---

## ⚠️ Common Issues

### ❌ Port Already in Use
**Error:** `Error: listen EADDRINUSE: address already in use :::5001`

**Solution:**
```powershell
# Find and kill the process using port 5001
netstat -ano | findstr :5001

# Then kill it (replace PID with actual number)
taskkill /PID <PID> /F

# Then start npm start again
npm start
```

### ❌ Dependencies Not Installed
**Error:** `Cannot find module 'express'`

**Solution:**
```powershell
cd Server
npm install
npm start
```

### ❌ MongoDB Connection Error
**Error:** `Error: MongoDB Connected: failed`

**Solution:**
1. Check `.env` file has correct `MONGODB_URI`
2. Verify MongoDB is running
3. Check internet connection (for MongoDB Atlas)

### ❌ Still Getting Connection Refused?
1. ✅ Is the terminal showing "Server running..."?
2. ✅ Did you wait 2-3 seconds after running `npm start`?
3. ✅ Did you use correct port 5001?
4. ✅ Can you access `http://localhost:5001/health`?

---

## 🎯 Next Steps After Server Starts

1. ✅ Keep this terminal open with the server running
2. ✅ Open a NEW PowerShell window (don't close this one!)
3. ✅ Start frontend: `cd Client && npm run dev`
4. ✅ Go to `http://localhost:5173/login`
5. ✅ Try registration/login again

---

## 💡 Pro Tips

✅ **Don't close the server terminal!** 
- Keep it running in the background
- All frontend requests go through it
- Closing it stops the backend

✅ **Use separate terminals:**
- Terminal 1: Backend (npm start)
- Terminal 2: Frontend (npm run dev)
- Terminal 3: Optional for git commands

✅ **Watch the console:**
- You'll see API requests logged in real-time
- Useful for debugging
- Look for errors if something fails

✅ **Monitor the port:**
- Backend: `http://localhost:5001`
- Frontend: `http://localhost:5173`
- Can be different if port 5173 is taken

---

## 📋 Quick Checklist

- [ ] Backend running: `npm start`
- [ ] Can access: `http://localhost:5001/health`
- [ ] Frontend running: `npm run dev`
- [ ] Can access: `http://localhost:5173/login`
- [ ] Both processes showing in terminal
- [ ] No error messages in console
- [ ] Ready to test login/registration

---

## 🆘 Still Need Help?

**Check these:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try registration
4. Check if request reaches `localhost:5001`
5. Look at response status code:
   - ✅ 200/201 = Success
   - ❌ 0/ERR_CONNECTION_REFUSED = Server not running
   - ❌ 401 = Authentication error
   - ❌ 400 = Bad request (validation error)
   - ❌ 500 = Server error

**Check server logs:**
1. Look at the PowerShell window where you ran `npm start`
2. See if there are error messages
3. Check for MongoDB connection errors
4. Look for port conflicts

---

**Version:** 1.0  
**Last Updated:** November 12, 2025
