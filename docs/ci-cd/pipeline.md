# 🚀 Server CI/CD Pipeline Documentation

## 📋 Overview

This document describes the Continuous Integration (CI) pipeline for the Trip Sky Way backend server. The pipeline is triggered on every push and pull request to the `main` and `develop` branches.

**Current Status**: ✅ **CI Only** (CD will be configured during deployment phase)

---

## 🎯 Pipeline Architecture

The CI pipeline follows industry best practices and runs **6 parallel and sequential jobs** to ensure code quality, security, and reliability.

### 📊 Pipeline Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      EVENT TRIGGER                              │
│  • Push to main/develop                                         │
│  • Pull Request to main/develop                                 │
│  • Changes in Server/ directory                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
     ┌─────▼────┐    ┌─────▼────┐   ┌─────▼────┐
     │   Lint   │    │  Security│   │  Env     │
     │  (Parallel)   │   (Parallel)   │  Check   │
     └─────┬────┘    └─────┬────┘   │ (Parallel)
           │               │        │
     ┌─────▼────┐    ┌─────▼────┐   │
     │   Build  │    │  Deps    │   │
     │(Depends) │    │ (Parallel)   │
     └─────┬────┘    └─────┬────┘   │
           │               │        │
           ├───────┬───────┴────────┘
           │       │
      ┌────▼──┬────▼─────┐
      │  Test │          │
      │(Depends)         │
      └────┬──┬──────────┘
           │  │
      ┌────▼──▼─────────────────┐
      │  CI Status Check        │
      │ (All Jobs Complete)     │
      └────┬────────────────────┘
           │
      ┌────▼─────┐
      │Notification│
      └───────────┘
```

---

## ✅ CI Jobs Explained

### 1. 🔍 **Lint & Code Quality Job**
**Purpose**: Ensure code follows project standards and best practices

**What it does**:
- Checks out the code
- Sets up Node.js environment with npm caching
- Installs dependencies
- Runs ESLint against all JavaScript files in `src/`

**Configuration**:
- **Runs on**: Ubuntu latest
- **Node version**: 18.x
- **Trigger**: Parallel execution
- **Fails if**: ESLint finds errors

**ESLint Rules Applied**:
- Airbnb base configuration
- ES2021 support
- Import validation
- Consistent formatting

---

### 2. 🧪 **Unit Tests & Coverage Job**
**Purpose**: Validate functionality and measure code coverage

**What it does**:
- Runs all Jest tests with coverage report
- Uploads coverage to Codecov
- Comments coverage results on PRs
- Generates coverage badges

**Configuration**:
- **Runs on**: Ubuntu latest
- **Depends on**: Lint job
- **Node version**: 18.x
- **Environment**: `NODE_ENV=test`

**Test Framework**:
- Jest (^29.7.0)
- Supertest for HTTP testing
- MongoDB Memory Server for database tests
- Coverage reporting

**Coverage Artifacts**:
- Saved to GitHub Actions cache
- Uploaded to Codecov
- Available in workflow artifacts

**PR Integration**:
- Automatically comments coverage reports
- Shows coverage changes
- Links to detailed reports

---

### 3. 🏗️ **Build Check Job**
**Purpose**: Validate syntax and ensure code can be parsed

**What it does**:
- Checks out the code
- Sets up Node.js
- Installs dependencies
- Performs syntax validation on main entry point
- Node compiles the file (`-c` flag)

**Configuration**:
- **Runs on**: Ubuntu latest
- **Depends on**: Lint job
- **Node version**: 18.x

**Build Validation**:
- Syntax validation only (no compilation needed for Node.js)
- Fast execution
- Catches basic errors early

---

### 4. 🔐 **Security Audit Job**
**Purpose**: Identify security vulnerabilities in dependencies

**What it does**:
- Runs `npm audit` to check for known vulnerabilities
- Optionally runs Snyk for advanced security scanning
- Reports findings without failing the build (unless critical)

**Configuration**:
- **Runs on**: Ubuntu latest
- **Audit level**: Moderate severity and above
- **Optional**: Snyk integration (requires `SNYK_TOKEN` secret)

**Severity Levels**:
- 🟢 **Low**: Informational
- 🟡 **Moderate**: Reviewed, not blocking
- 🟠 **High**: Snyk integration (if configured)
- 🔴 **Critical**: Would fail build (not yet implemented)

**Output**:
- Npm audit report
- Optional Snyk report
- Summary in workflow logs

---

### 5. 📦 **Dependency Audit Job**
**Purpose**: Check for outdated packages

**What it does**:
- Checks for outdated dependencies
- Reports available updates
- Suggests upgrade paths

**Configuration**:
- **Runs on**: Ubuntu latest
- **Node version**: 18.x

**Output**:
- List of outdated packages
- Available versions
- Recommendations

---

### 6. ⚙️ **Environment Configuration Job**
**Purpose**: Validate environment variable setup

**What it does**:
- Verifies `.env.example` exists
- Checks for all required environment variables
- Ensures proper configuration template

**Configuration**:
- **Runs on**: Ubuntu latest
- **Runs independently**: Can run in parallel

**Required Variables Checked**:
- `NODE_ENV`
- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `EMAIL_HOST`
- `STRIPE_SECRET_KEY`
- `RAZORPAY_KEY_ID`
- `CLOUDINARY_CLOUD_NAME`
- `CLIENT_URL`
- `MANAGEMENT_URL`

---

### 7. ✅ **CI Status Check Job**
**Purpose**: Summarize pipeline results and provide overall status

**What it does**:
- Waits for all previous jobs to complete
- Summarizes results
- Creates GitHub Check Run
- Reports final status

**Configuration**:
- **Depends on**: All other jobs
- **Condition**: Always runs (even if previous jobs fail)

**Outputs**:
- Summary table of all job statuses
- GitHub Check Run with pass/fail
- Direct link to workflow run

---

### 8. 📧 **Notifications Job**
**Purpose**: Alert team of pipeline status

**What it does**:
- Sends Slack notifications (optional)
- Comments on PRs if failed
- Provides direct links to logs

**Configuration**:
- **Depends on**: CI Status Check
- **Requires**: Optional secrets (Slack webhook)

**Integration**:
- **Slack**: Set `SLACK_WEBHOOK_URL` secret
- **GitHub**: Auto-configured PR comments
- **Email**: Via GitHub notifications (default)

---

## 🔄 Trigger Conditions

The pipeline triggers on:

### ✅ **Push Events**
```yaml
on:
  push:
    branches:
      - main
      - develop
    paths:
      - 'Server/**'           # Only if Server files change
      - '.github/workflows/*' # Or if workflow files change
```

### ✅ **Pull Request Events**
```yaml
on:
  pull_request:
    branches:
      - main
      - develop
    paths:
      - 'Server/**'
```

### 📝 **Branch Protection**

Recommend setting branch protection rules:
```
For 'main' branch:
✅ Require status checks to pass
✅ Require branches to be up to date
✅ Require code review approval
✅ Require conversation resolution
✅ Dismiss stale PR approvals
✅ Require commits to be signed (optional)

For 'develop' branch:
✅ Require status checks to pass
✅ Require branches to be up to date
```

---

## 🔐 Secrets Configuration

The following optional secrets can be configured in GitHub:

### **Required Secrets** (None - all optional for current setup)

### **Optional Secrets**

1. **`SNYK_TOKEN`**
   - For advanced security scanning
   - Get from: https://snyk.io
   - Used in: Security Audit job

2. **`SLACK_WEBHOOK_URL`**
   - For Slack notifications
   - Get from: Slack webhook integration
   - Used in: Notifications job

### **How to Set Secrets**
1. Go to Repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add secret name and value
4. Click "Add secret"

---

## 📊 Environment Variables

The pipeline uses the following environment variables:

```yaml
env:
  NODE_VERSION: '18.x'  # Matches package.json engines
  NPM_VERSION: '9.x'    # Matches package.json engines
```

### **Per-Job Variables**
- `NODE_ENV: test` - Set during test execution
- `SLACK_WEBHOOK_URL` - Optional, from secrets

---

## 🔄 Caching Strategy

The pipeline implements smart caching for performance:

### **NPM Dependencies Cache**
```yaml
cache:
  path: ~/.npm
  key: npm-cache-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}
```

**Benefits**:
- 🚀 Faster dependency installation
- 💾 Reduced bandwidth usage
- ⏱️ ~30-40% faster pipeline execution

### **Lint Cache**
```yaml
path: Server/.eslintcache
key: lint-cache-${{ github.run_id }}
```

### **Test Coverage Cache**
```yaml
path: Server/coverage
key: test-cache-${{ github.run_id }}
```

---

## 📈 Artifacts & Reports

### **Generated Artifacts**

1. **Coverage Reports**
   - Location: `Server/coverage/`
   - Format: LCOV, JSON, HTML
   - Uploaded to: Codecov
   - PR Comment: Yes

2. **Lint Cache**
   - Speeds up subsequent runs
   - 7-day retention

3. **Test Results**
   - Full test output in logs
   - Coverage metrics on PR

---

## 🚨 Failure Handling

### **What happens on failure?**

1. **Lint Fails**
   - ❌ Pipeline stops
   - 🔴 Build marked as failed
   - 📧 Notification sent (if configured)
   - 💡 Suggestion: Run `npm run lint:fix` locally

2. **Tests Fail**
   - ❌ Pipeline continues (tests don't block other jobs)
   - 🔴 Build marked as failed
   - 📊 Coverage report still generated
   - 💡 Suggestion: Review test logs for failures

3. **Build Check Fails**
   - ❌ Pipeline stops
   - 🔴 Syntax error detected
   - 📧 Notification sent
   - 💡 Suggestion: Check Node syntax validation

4. **Security Audit Fails**
   - ⚠️ Warning only (continues)
   - 📊 Report available
   - 💡 Suggestion: Review and patch vulnerabilities

5. **Env Check Fails**
   - ❌ Pipeline stops
   - 🔴 Missing required variables
   - 📧 Notification sent
   - 💡 Suggestion: Update `.env.example`

---

## 📋 Configuration Reference

### **GitHub Actions Syntax**

```yaml
# File location
.github/workflows/server-ci.yml

# Workflow name displayed in Actions tab
name: 🚀 Server CI Pipeline

# Trigger conditions
on:
  push:
    branches: [main, develop]
    paths: [Server/**, .github/workflows/server-ci.yml]
  pull_request:
    branches: [main, develop]

# Global environment variables
env:
  NODE_VERSION: '18.x'

# Jobs (parallel execution unless depends_on specified)
jobs:
  job-name:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
```

---

## 🔧 Local Testing of Workflow

### **Option 1: Using GitHub CLI**
```bash
gh workflow run server-ci.yml -f ref=develop
```

### **Option 2: Using act (Local)**
```bash
# Install act: https://github.com/nektos/act

# Run workflow locally
act -j lint --secret-file .env.example

# Run specific job
act -j test
```

### **Option 3: Manual Trigger on Push**
```bash
git add .
git commit -m "Trigger CI pipeline"
git push origin develop
```

---

## 📊 Monitoring & Analytics

### **GitHub Actions Insights**
- Location: Actions tab → Workflows → Click workflow
- Metrics:
  - ⏱️ Execution time trends
  - 📊 Success/failure rates
  - 💾 Workflow job metrics

### **Codecov Dashboard**
- Location: https://codecov.io/gh/LushWare-Org/Trip-Sky-Way
- Metrics:
  - 📈 Coverage trends
  - 📊 File-level coverage
  - 🎯 Coverage targets

---

## 📝 Best Practices Implemented

### ✅ **Security**
- Vulnerability scanning (npm audit + Snyk)
- Dependency auditing
- Environment validation
- Secure secret management

### ✅ **Performance**
- Parallel job execution
- Smart caching
- Conditional steps
- Fast feedback loops

### ✅ **Reliability**
- Multiple validation layers
- Comprehensive error handling
- Clear status reporting
- Detailed logging

### ✅ **Developer Experience**
- PR coverage comments
- Clear failure messages
- Quick local reproduction
- Notification integration

### ✅ **Scalability**
- Modular job structure
- Easy to add new jobs
- Reusable actions
- Future-proof design

---

## 🔄 Migration Path to CD

When deployment is ready:

1. **Add Deployment Jobs**
   ```yaml
   deploy:
     needs: [lint, test, build]
     runs-on: ubuntu-latest
     steps:
       - Build Docker image
       - Push to registry
       - Deploy to staging
       - Deploy to production
   ```

2. **Add Environment-Specific Secrets**
   ```yaml
   - DOCKER_REGISTRY_USERNAME
   - DOCKER_REGISTRY_PASSWORD
   - STAGING_DEPLOYMENT_KEY
   - PROD_DEPLOYMENT_KEY
   ```

3. **Add Deployment Notifications**
   ```yaml
   - Slack notifications
   - Discord webhooks
   - Email alerts
   - GitHub deployments
   ```

4. **Add Health Checks**
   ```yaml
   - API health endpoint verification
   - Smoke tests
   - Rollback triggers
   ```

---

## 🆘 Troubleshooting

### **Pipeline runs but jobs don't execute**
- ✅ Check branch filter in `on.push.branches`
- ✅ Verify path filters
- ✅ Check workflow syntax with `act`

### **NPM dependencies not found**
- ✅ Clear cache: Actions → Caches → Delete cache
- ✅ Verify `package-lock.json` is committed
- ✅ Check Node version compatibility

### **ESLint fails locally but passes in CI**
- ✅ Run `npm run lint:fix` to auto-fix
- ✅ Check local Node version matches CI (18.x)
- ✅ Clear `.eslintcache`: `rm -rf .eslintcache`

### **Tests pass locally but fail in CI**
- ✅ Check environment variables (`.env` not in CI)
- ✅ Verify `NODE_ENV=test` is set
- ✅ Check for timing-related flakes

### **PR not showing status checks**
- ✅ Verify workflow file is committed
- ✅ Check branch protection rules
- ✅ Wait for workflow to complete

---

## 📚 Related Documentation

- **[Development Setup](../development/SETUP.md)** - Local development guide
- **[Environment Security](../development/ENVIRONMENT_SECURITY.md)** - Secret management
- **[Architecture](../architecture/ARCHITECTURE.md)** - System design
- **[TODO](../development/TODO.md)** - Feature roadmap

---

## 🎯 Next Steps

### **Immediate**
- ✅ Commit `.github/workflows/server-ci.yml`
- ✅ Configure branch protection rules
- ✅ Test pipeline on a PR

### **Short-term**
- ⬜ Optimize build time
- ⬜ Add SNYK_TOKEN secret (if using Snyk)
- ⬜ Configure Slack webhook (if using Slack)

### **Medium-term**
- ⬜ Implement CD pipeline
- ⬜ Add containerization (Docker)
- ⬜ Set up deployment environments

### **Long-term**
- ⬜ Add performance testing
- ⬜ Implement load testing
- ⬜ Add compliance scanning

---

**Last Updated**: October 20, 2025  
**Status**: ✅ Active & Operational  
**Version**: 1.0.0
