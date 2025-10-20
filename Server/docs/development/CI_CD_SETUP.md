# ⚙️ CI/CD Pipeline Setup Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Verify Workflow File
The CI/CD pipeline is already configured in `.github/workflows/server-ci.yml`

```bash
# Check if file exists
ls -la .github/workflows/server-ci.yml
```

### Step 2: Push to Repository
```bash
git add .github/workflows/server-ci.yml
git commit -m "Add CI/CD pipeline for server"
git push origin develop
```

### Step 3: View Pipeline Execution
1. Go to GitHub repository
2. Click "Actions" tab
3. Select "🚀 Server CI Pipeline"
4. Click latest workflow run

### Step 4: Verify All Jobs Pass
Expected jobs:
- ✅ Lint & Code Quality
- ✅ Unit Tests & Coverage
- ✅ Build Check
- ✅ Security Audit
- ✅ Dependency Audit
- ✅ Environment Configuration

---

## 🔧 Configuration Options

### Setting Optional Secrets

#### **Option 1: Snyk Security Token** (Optional)
```bash
# 1. Create account at https://snyk.io
# 2. Copy your API token
# 3. Go to Repository Settings → Secrets → New secret
# 4. Add:
#    Name: SNYK_TOKEN
#    Value: <your-snyk-token>
```

#### **Option 2: Slack Notifications** (Optional)
```bash
# 1. Create Slack Webhook at: https://api.slack.com/messaging/webhooks
# 2. Go to Repository Settings → Secrets → New secret
# 3. Add:
#    Name: SLACK_WEBHOOK_URL
#    Value: <your-webhook-url>
```

---

## 📋 Configuration Checklist

### ✅ **For Main Branch**

1. **Branch Protection Rules**
   ```
   Settings → Branches → main
   ✅ Require status checks to pass
   ✅ Require branches to be up to date
   ✅ Require code reviews (at least 1)
   ✅ Require PR merge before deleting
   ```

2. **Status Checks Required**
   - ✅ 🔍 Lint & Code Quality
   - ✅ 🧪 Unit Tests & Coverage
   - ✅ 🏗️ Build Check
   - ✅ ✅ CI Pipeline Status

### ✅ **For Develop Branch**

1. **Branch Protection Rules**
   ```
   Settings → Branches → develop
   ✅ Require status checks to pass
   ✅ Require branches to be up to date
   ⭕ (Code review: Optional)
   ```

2. **Status Checks Required**
   - ✅ 🔍 Lint & Code Quality
   - ✅ 🧪 Unit Tests & Coverage
   - ✅ 🏗️ Build Check

---

## 🎯 Workflow Triggers

### Push Events
Trigger on push to main/develop when Server files change:
```
git push origin develop
```

### Pull Request Events
Trigger automatically when PR is opened against main/develop:
```
git push origin feature/my-feature
# Then create PR on GitHub
```

### Manual Trigger (GitHub CLI)
```bash
# Install: https://cli.github.com
gh workflow run server-ci.yml -f ref=develop
```

---

## 📊 Monitoring Workflow

### **In GitHub UI**
1. Repository → Actions tab
2. Click workflow name: "🚀 Server CI Pipeline"
3. View live execution

### **View Specific Job**
1. Click workflow run
2. Click job name
3. Expand any step

### **Check Coverage**
1. Click "Unit Tests & Coverage" job
2. Look for coverage comment on PR
3. Visit https://codecov.io for detailed reports

---

## 🔄 Local Testing Before Push

### **Test Lint Locally**
```bash
cd Server
npm run lint

# Auto-fix issues
npm run lint:fix
```

### **Test Syntax**
```bash
cd Server
node -c src/server.js
```

### **Test Build**
```bash
cd Server
node --check src/server.js
```

### **Run Tests Locally**
```bash
cd Server
npm run test
```

---

## 🚨 Common Issues & Solutions

### Issue: Workflow Not Triggering

**Cause**: File paths not matching

**Solution**:
```yaml
# Ensure these paths are correct in .github/workflows/server-ci.yml:
paths:
  - 'Server/**'                      # Capitalization matters!
  - '.github/workflows/server-ci.yml'
```

**Verification**:
```bash
# Check exact folder structure
ls -la | grep -i server
# Should show: Server/ (with capital S)
```

### Issue: Tests Passing Locally but Failing in CI

**Cause**: Missing `.env` file in CI

**Solution**:
Workflow automatically sets `NODE_ENV=test`. Make sure tests use mocked data:
```javascript
// Example test setup
beforeAll(async () => {
  // Use mongodb-memory-server instead of real DB
  // Don't rely on .env variables
});
```

### Issue: Security Scan Failing

**Cause**: Known vulnerabilities in dependencies

**Solution**:
```bash
# Check vulnerabilities
npm audit

# Update dependencies
npm audit fix

# Or update specific package
npm update package-name
```

### Issue: Coverage Report Not Appearing on PR

**Cause**: Codecov not authenticated

**Solution**:
1. Go to https://codecov.io
2. Sign in with GitHub
3. Add repository
4. No token needed for public repos

---

## 📈 Performance Optimization

### **Current Pipeline Time**: ~3-5 minutes

### **Caching Strategy**
Pipeline uses smart caching to speed up subsequent runs:
- NPM dependencies: Cached via `package-lock.json`
- Lint cache: `.eslintcache`
- Test coverage: Reused between runs

### **Optimize Further**
```yaml
# Add to workflow for faster builds:
- name: Cache Node modules
  uses: actions/cache@v3
  with:
    path: Server/node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

---

## 🔐 Security Best Practices

### ✅ **Do's**
- ✅ Keep `.env.example` committed (no secrets!)
- ✅ Use GitHub Secrets for sensitive data
- ✅ Review security audit reports
- ✅ Update dependencies regularly
- ✅ Require branch protection for main

### ❌ **Don'ts**
- ❌ Never commit `.env` files
- ❌ Never hardcode secrets in code
- ❌ Don't disable status checks
- ❌ Don't merge without running tests
- ❌ Don't ignore security warnings

---

## 📚 Documentation Reference

- **[Full CI/CD Documentation](../docs/ci-cd/pipeline.md)** - Detailed explanation
- **[Development Setup](./SETUP.md)** - Local environment setup
- **[Environment Security](./ENVIRONMENT_SECURITY.md)** - Secret management

---

## 🆘 Getting Help

### **Workflow Syntax Errors**
```bash
# Validate YAML syntax
npm install -g yaml
yamllint .github/workflows/server-ci.yml
```

### **Test Failures Locally**
```bash
cd Server
npm run test -- --verbose --no-coverage
```

### **Lint Issues**
```bash
cd Server
npm run lint -- --debug
```

### **Check Node Version**
```bash
node --version  # Should be 18.x or higher
npm --version   # Should be 9.x or higher
```

---

## ✅ Verification Checklist

- [ ] `.github/workflows/server-ci.yml` file created
- [ ] File committed and pushed to repository
- [ ] Workflow appears in Actions tab
- [ ] All 6 jobs execute successfully
- [ ] Coverage reports appear on PR (if applicable)
- [ ] Branch protection rules configured
- [ ] Optional secrets added (if desired)
- [ ] Team members notified of new CI process

---

## 🎯 Next Steps

1. **Immediate**
   - ✅ Commit workflow file
   - ✅ Test on a PR
   - ✅ Verify all jobs pass

2. **Short-term** (Next week)
   - ⬜ Configure branch protection
   - ⬜ Add Snyk token (if desired)
   - ⬜ Set up Slack notifications

3. **Medium-term** (Next month)
   - ⬜ Add performance benchmarks
   - ⬜ Implement CD pipeline
   - ⬜ Add pre-deployment checks

---

**Last Updated**: October 20, 2025  
**Status**: ✅ Ready for Use  
**Version**: 1.0.0
