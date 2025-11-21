# PowerShell Issues and Solutions

## Why PowerShell Commands Fail

### 1. **`&&` Operator Not Supported in PowerShell 5.1**

**Problem:**
```powershell
cd Server && node src/scripts/test.js
# Error: The token '&&' is not a valid statement separator
```

**Reason:**
- PowerShell 5.1 (Windows default) doesn't support `&&` operator
- `&&` was introduced in PowerShell 7.0+
- Your system: PowerShell 5.1.26100.7019

**Solutions:**

**Option A: Use Semicolon (`;`)**
```powershell
cd Server; node src/scripts/test.js
```

**Option B: Use Separate Commands**
```powershell
cd Server
node src/scripts/test.js
```

**Option C: Use PowerShell 7+**
- Install PowerShell 7 from: https://aka.ms/powershell-release
- Then `&&` will work

### 2. **Path Doubling Issue**

**Problem:**
```powershell
cd Server && node src/scripts/test.js
# Error: Cannot find path 'C:\Users\...\Server\Server\...'
```

**Reason:**
- When already in a directory, `cd Server` tries to go to `Server\Server`
- PowerShell doesn't handle relative paths the same as bash

**Solution:**
```powershell
# Use absolute path or check current directory first
cd C:\Users\hasat\Trip-Sky-Way\Server
node src/scripts/test.js

# Or use Push-Location
Push-Location Server
node src/scripts/test.js
Pop-Location
```

### 3. **Command Chaining Differences**

**Bash/Linux:**
```bash
cd Server && npm install && npm run dev
```

**PowerShell 5.1:**
```powershell
cd Server; if ($?) { npm install }; if ($?) { npm run dev }
```

**PowerShell 7+:**
```powershell
cd Server && npm install && npm run dev
```

## Quick Reference

### ✅ **Working Commands for PowerShell 5.1:**

```powershell
# Single command
node Server/src/scripts/test.js

# Multiple commands with semicolon
cd Server; npm install; npm run dev

# Check if previous command succeeded
cd Server; if ($?) { node src/scripts/test.js }

# Use absolute paths
cd C:\Users\hasat\Trip-Sky-Way\Server
node src/scripts/test.js
```

### ❌ **Commands That DON'T Work in PowerShell 5.1:**

```powershell
# These will fail:
cd Server && node test.js
cd Server && npm install
command1 && command2
```

## Recommended Solutions

### For This Project:

1. **Use semicolons instead of `&&`:**
   ```powershell
   cd Server; node src/scripts/testRestAPI.js
   ```

2. **Use absolute paths:**
   ```powershell
   node C:\Users\hasat\Trip-Sky-Way\Server\src\scripts\testRestAPI.js
   ```

3. **Or upgrade to PowerShell 7:**
   - Download: https://aka.ms/powershell-release
   - Then `&&` will work

## Environment Variable Issues

### Checking .env in PowerShell:

```powershell
# Load .env and check
cd Server
node -e "require('dotenv').config(); console.log(process.env.GEMINI_API_KEY ? 'Key found' : 'Key not found')"
```

### Common .env Issues in PowerShell:

1. **Line endings:** Windows uses CRLF, can cause issues
2. **Encoding:** Must be UTF-8 without BOM
3. **Quotes:** PowerShell may interpret quotes differently

## Summary

**Main Reasons for PowerShell Errors:**
1. ❌ `&&` operator not supported (needs PowerShell 7+)
2. ❌ Path resolution differences
3. ❌ Command chaining syntax different
4. ❌ Environment variable handling differences

**Quick Fix:**
- Use `;` instead of `&&`
- Use absolute paths
- Or upgrade to PowerShell 7


