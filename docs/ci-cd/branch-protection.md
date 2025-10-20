# 🔒 Branch Protection Configuration

This guide helps you set up branch protection rules to enforce CI/CD checks and maintain code quality.

---

## 📋 Quick Setup

### **For Main Branch** (Production)

1. Go to **Repository Settings** → **Branches**
2. Click **Add rule**
3. Fill in branch name pattern: `main`
4. Enable the following:

#### **✅ Status Checks Required**
- [x] Require status checks to pass before merging
- [x] Require branches to be up to date before merging
- [x] Select required status checks:
  - 🔍 Lint & Code Quality
  - 🧪 Unit Tests & Coverage
  - 🏗️ Build Check
  - ✅ CI Pipeline Status

#### **✅ Pull Request Requirements**
- [x] Require pull request reviews before merging
- [x] Required number of reviewers: **2**
- [x] Require code review from CODEOWNERS (if available)
- [x] Dismiss stale pull request approvals when new commits are pushed
- [x] Require approval of the most recent reviewable push

#### **✅ Additional Protection**
- [x] Require conversation resolution before merging
- [x] Require signed commits (optional, for security)
- [x] Include administrators
- [x] Restrict who can push to matching branches

#### **✅ Dismiss Stale Reviews**
- [x] When new commits are pushed

---

### **For Develop Branch** (Development)

1. Go to **Repository Settings** → **Branches**
2. Click **Add rule**
3. Fill in branch name pattern: `develop`
4. Enable the following:

#### **✅ Status Checks Required**
- [x] Require status checks to pass before merging
- [x] Require branches to be up to date before merging
- [x] Select required status checks:
  - 🔍 Lint & Code Quality
  - 🧪 Unit Tests & Coverage
  - 🏗️ Build Check

#### **✅ Pull Request Requirements**
- [x] Require pull request reviews before merging
- [x] Required number of reviewers: **1** (flexible for development)
- [x] Dismiss stale pull request approvals when new commits are pushed

#### **✅ Additional Protection**
- [x] Require conversation resolution before merging
- [x] Include administrators

---

## 🔐 Status Checks Reference

### **What to Select**

When you're asked "Select status checks to require":

```
✅ 🔍 Lint & Code Quality
✅ 🧪 Unit Tests & Coverage  
✅ 🏗️ Build Check
✅ ✅ CI Pipeline Status
```

**First time setup note**: 
- Status checks only appear after workflow completes once
- Push to branch → Actions tab → wait for checks
- Then return to branch protection and select them

---

## 🚀 Setup Instructions (Step by Step)

### **Step 1: Access Branch Settings**
```
1. Go to GitHub repository
2. Click Settings (gear icon)
3. Left sidebar → Branches
4. Click "Add rule"
```

### **Step 2: Configure Main Branch**

```
Branch name pattern: main

✅ STATUS CHECKS
[x] Require status checks to pass before merging
[x] Require branches to be up to date before merging

Select status checks:
[x] Lint & Code Quality
[x] Unit Tests & Coverage
[x] Build Check
[x] CI Pipeline Status

✅ PULL REQUESTS
[x] Require pull request reviews before merging
    Approval count: 2
[x] Require code review from CODEOWNERS
[x] Dismiss stale pull request approvals
[x] Require approval of most recent reviewable push

✅ ADDITIONAL
[x] Require conversation resolution
[x] Require signed commits
[x] Include administrators
[x] Restrict who can push
```

### **Step 3: Configure Develop Branch**

```
Branch name pattern: develop

✅ STATUS CHECKS
[x] Require status checks to pass before merging
[x] Require branches to be up to date before merging

Select status checks:
[x] Lint & Code Quality
[x] Unit Tests & Coverage
[x] Build Check

✅ PULL REQUESTS
[x] Require pull request reviews before merging
    Approval count: 1
[x] Dismiss stale pull request approvals

✅ ADDITIONAL
[x] Require conversation resolution
[x] Include administrators
```

### **Step 4: Save Rules**
- Click **Create** or **Save changes**
- Rules are now active!

---

## 📊 Configuration Comparison

| Feature | Main | Develop |
|---------|------|---------|
| Require status checks | ✅ Yes | ✅ Yes |
| Required reviews | 2 | 1 |
| Require signed commits | ✅ Optional | ❌ No |
| Include administrators | ✅ Yes | ✅ Yes |
| Dismiss stale reviews | ✅ Yes | ✅ Yes |
| Require conversation resolution | ✅ Yes | ✅ Yes |

---

## 🎯 Status Checks Explained

### **🔍 Lint & Code Quality**
- **What**: Runs ESLint checks
- **Failure Reason**: Code doesn't follow style guide
- **Fix**: Run `npm run lint:fix` locally

### **🧪 Unit Tests & Coverage**
- **What**: Runs Jest tests with coverage
- **Failure Reason**: Test failure or low coverage
- **Fix**: Fix failing tests, add new tests

### **🏗️ Build Check**
- **What**: Validates syntax
- **Failure Reason**: Syntax error in code
- **Fix**: Fix syntax error

### **✅ CI Pipeline Status**
- **What**: Overall status of all jobs
- **Failure Reason**: Any job failed
- **Fix**: Fix the specific job failure

---

## 🚫 What Happens When Rule is Violated?

### **❌ If You Try to Merge Without Passing Checks**

```
Error: Cannot merge:
- This branch has 1 failed status check
- 2 approvals required, 1 provided
- Stale pull request approvals will be dismissed
```

### **Merge Button States**
- 🟢 **Green** (Mergeable): All checks pass
- 🟡 **Yellow** (Waiting): Checks in progress
- 🔴 **Red** (Not Mergeable): Checks failed

---

## 👥 Restricting Who Can Push

### **Setup**

1. In branch protection settings
2. Under **Restrictions**
3. Check **Restrict who can push to matching branches**
4. Choose options:
   - Administrators only
   - Specific teams/users

### **Recommended Setup**

```
Restrict who can push:
✅ Administrators only

This prevents:
- Accidental direct pushes to main
- Bypassing PR review process
- Force pushes
```

---

## 🔄 Working with Branch Protection

### **❌ What You CAN'T Do**
```bash
# ❌ Direct push to main (blocked)
git push origin feature/my-feature:main
# ERROR: remote: error: GH006: Protected branch push

# ❌ Force push to main (blocked)
git push -f origin main
# ERROR: remote: error: GH006: Protected branch force push
```

### **✅ What You CAN Do**
```bash
# ✅ Create PR from feature branch
git checkout -b feature/my-feature
git push origin feature/my-feature
# (Then create PR on GitHub)

# ✅ Push to feature branch
git push origin feature/my-feature

# ✅ Merge when checks pass and reviews approved
# (Use GitHub UI to merge)
```

---

## 🆘 Troubleshooting

### **Issue: Can't see status checks to select**

**Cause**: Workflow hasn't run yet

**Solution**:
1. Go to **Actions** tab
2. Wait for workflow to complete
3. Return to branch protection settings
4. Refresh page
5. Status checks should now appear

### **Issue: Status checks not appearing in required list**

**Solution**:
```
1. Close branch protection rule
2. Go to Actions tab
3. Verify workflow runs and succeeds
4. Re-open branch protection rule
5. Status checks should now appear
```

### **Issue: Can't merge despite passing checks**

**Check**:
- [ ] All status checks passing (green)
- [ ] Required reviews approved
- [ ] Conversations resolved
- [ ] Branch up to date with main
- [ ] No code owners blocking

### **Issue: Signed commit requirement causing issues**

**Solution**: If enabling signed commits:
1. Configure GPG keys: https://docs.github.com/en/authentication/managing-commit-signature-verification
2. Sign commits: `git commit -S -m "message"`
3. Or disable this requirement if not needed

---

## 📝 Recommended Rules Summary

### **Production (Main Branch)**
```
Strictness: 🔴 HIGH
- 2 code reviews required
- All status checks required
- Admins included
- Signed commits (optional)
- Stale reviews dismissed
```

### **Development (Develop Branch)**
```
Strictness: 🟡 MEDIUM
- 1 code review required
- All status checks required
- Admins included
- Stale reviews dismissed
```

### **Feature Branches**
```
Strictness: 🟢 LOW
- No branch protection
- Standard PR review (via develop)
- Deleted after merge
```

---

## ✅ Verification Checklist

After setting up branch protection:

- [ ] Main branch protection active
- [ ] Develop branch protection active
- [ ] Status checks configured
- [ ] Required reviews configured
- [ ] PR template appears on new PRs
- [ ] Merge button shows correct status
- [ ] Team members can see restrictions

---

## 📚 Related Documentation

- **[CI/CD Pipeline](./pipeline.md)** - Full pipeline documentation
- **[Contributing Guide](./docs/CONTRIBUTING.md)** - How to contribute
- **[PR Template](./.github/pull_request_template.md)** - PR requirements

---

## 🔗 GitHub Documentation

- [Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Status Checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories/about-status-checks)
- [Required Reviews](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-required-reviews-for-pull-requests)

---

**Last Updated**: October 20, 2025  
**Status**: ✅ Ready for Use  
**Version**: 1.0.0
