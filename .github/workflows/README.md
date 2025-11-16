# 🤖 GitHub Actions Workflows

This directory contains automated workflow configurations for Continuous Integration (CI) and future Continuous Deployment (CD) pipelines.

---

## 📋 Workflows

### **🚀 Server CI Pipeline** (`server-ci.yml`)

Comprehensive Continuous Integration pipeline for the Trip Sky Way backend server.

**Purpose**: Automate testing, linting, security scanning, and code quality checks

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- File changes in `Server/` directory

**Jobs**:
1. 🔍 **Lint & Code Quality** - ESLint validation
2. 🧪 **Unit Tests & Coverage** - Jest test execution
3. 🏗️ **Build Check** - Syntax validation
4. 🔐 **Security Audit** - Vulnerability scanning
5. 📦 **Dependency Audit** - Outdated package detection
6. ⚙️ **Environment Configuration** - Variable validation

**Status Checks**: All must pass before merge to `main`

**Documentation**:
- [Full Pipeline Documentation](../docs/ci-cd/pipeline.md)
- [Quick Setup Guide](../Server/docs/development/CI_CD_SETUP.md)

---

## 🔧 Configuration

### **Environment Variables**

None required for basic operation. Optional GitHub Secrets:

- `SNYK_TOKEN` - For advanced security scanning
- `SLACK_WEBHOOK_URL` - For Slack notifications

**How to set**: Repository Settings → Secrets and variables → Actions

### **Branch Filters**

```yaml
on:
  push:
    branches:
      - main
      - develop
    paths:
      - 'Server/**'
      - '.github/workflows/**'
  pull_request:
    branches:
      - main
      - develop
```

---

## ✅ Status Checks

All workflows create the following status checks (visible in PR):

- ✅ Lint & Code Quality
- ✅ Unit Tests & Coverage
- ✅ Build Check
- ✅ Security Audit (informational)
- ✅ CI Pipeline Status (overall)

**Required for Merge**: Lint, Tests, Build, and CI Status checks

---

## 🚀 Running Workflows

### **Automatic Triggers**

Workflows run automatically on:
- Push to protected branches
- Pull request creation/update
- Scheduled times (if configured)

### **Manual Trigger** (GitHub CLI)

```bash
# Run workflow by name
gh workflow run "🚀 Server CI Pipeline" -f ref=develop

# List available workflows
gh workflow list

# View workflow details
gh workflow view "server-ci.yml"
```

### **Local Testing**

Use `act` to test workflows locally:

```bash
# Install act: https://github.com/nektos/act

# Run specific job
act -j lint

# Run all jobs
act

# With specific branch
act -e event.json
```

---

## 📊 Monitoring

### **GitHub Actions Tab**

1. Repository → Actions tab
2. Select workflow: "🚀 Server CI Pipeline"
3. View recent runs with status

### **Workflow Runs**

Each run shows:
- ⏱️ Execution time
- 📊 Job results
- 📝 Log output
- 🔗 Related PR/commit

### **Badges**

Add workflow status badge to README:

```markdown
[![CI](https://github.com/LushWare-Org/Trip-Sky-Way/actions/workflows/server-ci.yml/badge.svg)](https://github.com/LushWare-Org/Trip-Sky-Way/actions/workflows/server-ci.yml)
```

---

## 🔒 Security

### **Best Practices**

- ✅ No secrets hardcoded in workflow
- ✅ Secrets stored in GitHub Secrets
- ✅ Restricted to authenticated users
- ✅ Audit logging enabled
- ✅ Token scopes limited

### **Secrets Management**

```yaml
# ✅ CORRECT: Use secrets context
- name: Use secret
  run: echo "Token is ${{ secrets.SNYK_TOKEN }}"

# ❌ WRONG: Hardcoded secrets
- name: Use secret
  run: echo "Token is sk_test_12345abc"
```

---

## 🆘 Troubleshooting

### **Workflow Not Running**

**Check**:
1. File saved in `.github/workflows/` directory
2. Branches match trigger conditions
3. File paths not matching (case-sensitive)
4. Permissions on repository

**Solution**:
```bash
# Verify workflow syntax
gh workflow view server-ci.yml
```

### **Jobs Skipped**

**Reasons**:
- Path filters exclude changes
- Branch protection rules not met
- Insufficient permissions

**Check**: Workflow summary shows skip reason

### **Status Check Not Appearing**

**Wait**: 2-3 minutes for workflow to complete first run

**Then**: Go to branch protection settings and select from list

---

## 📝 File Structure

```
.github/
├── workflows/
│   ├── server-ci.yml          ← Main CI pipeline
│   └── README.md              ← This file
└── pull_request_template.md   ← PR template
```

---

## 📚 Documentation

### **For Understanding the Pipeline**
- [CI/CD Pipeline Documentation](../docs/ci-cd/pipeline.md)
- [CI/CD Setup Guide](../Server/docs/development/CI_CD_SETUP.md)
- [Visual Guide](../docs/ci-cd/visual-guide.md)

### **For Setting Up**
- [Branch Protection Guide](../docs/ci-cd/branch-protection.md)
- [Contributing Guide](../docs/CONTRIBUTING.md)

### **GitHub Resources**
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)

---

## 🎯 Next Steps

### **Immediate**
- [ ] Workflow file committed
- [ ] Verify workflow runs
- [ ] Check all jobs pass

### **Short-term**
- [ ] Add Snyk token (optional)
- [ ] Configure Slack notifications (optional)
- [ ] Set up branch protection

### **Medium-term**
- [ ] Add more workflows (if needed)
- [ ] Implement CD pipeline
- [ ] Add scheduled jobs

---

## 📞 Support

Questions about workflows?

1. Check [CI/CD Setup Guide](../Server/docs/development/CI_CD_SETUP.md)
2. Review workflow file syntax
3. Check GitHub Actions documentation
4. Create issue if needed

---

**Last Updated**: October 20, 2025  
**Status**: ✅ Active  
**Maintainers**: @LushWare-Org/Trip-Sky-Way
