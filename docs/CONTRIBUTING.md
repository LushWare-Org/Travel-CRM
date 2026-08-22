# 🤝 Contributing Guide

Welcome to Trip Sky Way! We're excited to have you contribute to our Travel Agency Management System. This guide will help you understand our development process and how to submit your work.

---

## 📋 Table of Contents

1. [Code of Conduct](#-code-of-conduct)
2. [Getting Started](#-getting-started)
3. [Development Workflow](#-development-workflow)
4. [Making Changes](#-making-changes)
5. [Submitting Pull Requests](#-submitting-pull-requests)
6. [Code Standards](#-code-standards)
7. [Testing Guidelines](#-testing-guidelines)
8. [Documentation](#-documentation)

---

## 🎯 Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors.

### ✅ **Expected Behavior**
- Use welcoming and inclusive language
- Be respectful of differing opinions and experiences
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

### ❌ **Unacceptable Behavior**
- The use of sexualized language or imagery
- Trolling, insulting/derogatory comments
- Public or private harassment
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

---

## 🚀 Getting Started

### **1. Fork & Clone Repository**
```bash
# Fork on GitHub, then clone your fork
git clone https://github.com/<YOUR-USERNAME>/Trip-Sky-Way.git
cd Trip-Sky-Way

# Add upstream remote
git remote add upstream https://github.com/LushWare-Org/Trip-Sky-Way.git
```

### **2. Create Development Branch**
```bash
# Update your local main
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/my-feature-name
# or
git checkout -b bugfix/issue-description
```

### **3. Setup Development Environment**
See **[Setup Guide](./Server/docs/development/SETUP.md)** for detailed instructions:
```bash
cd Server
npm install
npm run dev
```

---

## 🔄 Development Workflow

### **Step 1: Create Feature Branch**
```bash
# Branch naming conventions:
# - feature/description        (new features)
# - bugfix/description         (bug fixes)
# - docs/description           (documentation)
# - chore/description          (maintenance)
# - refactor/description       (code refactoring)

git checkout -b feature/user-authentication
```

### **Step 2: Make Your Changes**
```bash
# Make your code changes
# Follow code standards (see below)
# Add tests for new functionality

# Check your work before committing
npm run lint        # Check code quality
npm run test        # Run tests
npm run lint:fix    # Auto-fix lint issues
```

### **Step 3: Commit Changes**
```bash
# Commit messages should be clear and descriptive
# Format: <type>(<scope>): <subject>
# Types: feat, fix, docs, style, refactor, perf, test, chore

git add .
git commit -m "feat(auth): implement JWT token refresh"
git commit -m "fix(booking): resolve date validation error"
git commit -m "docs(api): update endpoint documentation"
```

### **Step 4: Push & Create PR**
```bash
# Push to your fork
git push origin feature/user-authentication

# Go to GitHub and create Pull Request
# Fill out the PR template completely
```

### **Step 5: Respond to Review**
```bash
# Make requested changes
git add .
git commit -m "Address review comments"
git push origin feature/user-authentication

# Don't force push after review starts
# Use regular commits so reviewers can see changes
```

---

## 📝 Making Changes

### **Branch Selection**

| Branch | Purpose | Deploy To |
|--------|---------|-----------|
| `main` | Production release | Production |
| `develop` | Development integration | Staging |
| `feature/*` | New features | N/A (PR only) |
| `bugfix/*` | Bug fixes | PR → develop |
| `docs/*` | Documentation | PR → develop |

### **Always Create PRs to `develop`**
```bash
# ✅ CORRECT: PR to develop
- base: develop
- compare: feature/my-feature

# ❌ INCORRECT: PR directly to main
- base: main
- compare: feature/my-feature
```

### **File Organization**

```
Server/src/
├── controllers/     # Request handlers
├── models/         # Database schemas
├── routes/         # Endpoint definitions
├── middleware/     # Express middleware
├── services/       # Business logic
├── utils/          # Utility functions
└── config/         # Configuration files
```

**Guidelines**:
- Keep functions focused (single responsibility)
- Use descriptive names
- Group related functionality
- Separate concerns (controllers, services, utils)

---

## 📤 Submitting Pull Requests

### **PR Title Format**
```
[TYPE] Brief description of changes

Examples:
[FEATURE] Add JWT token refresh mechanism
[BUGFIX] Fix booking date validation
[DOCS] Update API documentation
[CHORE] Update dependencies
```

### **PR Description**
Use the PR template (auto-populated on GitHub):
1. Clear description of changes
2. Related issue number
3. Type of change
4. Testing performed
5. Checklist completion

### **Automated Checks**

All PRs trigger the **CI Pipeline**:

✅ **What We Check**:
- 🔍 Code quality (ESLint)
- 🧪 Unit tests (Jest)
- 🏗️ Build validation
- 🔐 Security vulnerabilities
- 📦 Dependency updates
- ⚙️ Environment configuration

**⚠️ All checks must pass before merge**

### **Review Process**

1. **Automated Checks** (run automatically)
   - ✅ Must pass to proceed
   - Visible in "Checks" tab

2. **Code Review** (manual)
   - At least 1 approval required
   - Constructive feedback provided
   - Up to 48 hours typical response time

3. **Merge** (after approval)
   - "Squash and merge" preferred
   - Clear commit message required
   - Delete branch after merge

---

## 📐 Code Standards

### **JavaScript/Node.js Standards**

We follow **Airbnb's JavaScript Style Guide** via ESLint.

#### **Key Rules**:

```javascript
// ✅ GOOD: Clear, descriptive names
const calculateBookingTotal = (price, quantity) => {
  return price * quantity;
};

// ❌ BAD: Unclear abbreviations
const calc = (p, q) => p * q;
```

```javascript
// ✅ GOOD: Proper error handling
const createUser = async (userData) => {
  try {
    const user = await User.create(userData);
    return user;
  } catch (error) {
    logger.error('User creation failed:', error);
    throw new AppError('Failed to create user', 400);
  }
};

// ❌ BAD: Silent failures
const createUser = async (userData) => {
  return await User.create(userData);
};
```

```javascript
// ✅ GOOD: Consistent formatting
const user = {
  name: 'John',
  email: 'john@example.com',
  role: 'admin',
};

// ❌ BAD: Inconsistent spacing
const user={name:'John',email:'john@example.com',role:'admin'}
```

#### **Environment Variables**
```javascript
// ✅ GOOD: Use env variables
const dbUrl = process.env.MONGODB_URI;
const apiKey = process.env.STRIPE_SECRET_KEY;

// ❌ BAD: Hardcoded secrets
const dbUrl = 'mongodb://user:pass@localhost:27017/db';
const apiKey = 'sk_test_12345abcde';
```

### **Run Linter**
```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

---

## 🧪 Testing Guidelines

### **Test Requirements**

- ✅ New features must include tests
- ✅ Bug fixes should include tests
- ✅ Minimum 80% code coverage
- ✅ All tests must pass

### **Writing Tests**

```javascript
// tests/auth.test.js
import request from 'supertest';
import app from '../src/server';

describe('Authentication Endpoints', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should create a new user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'SecurePass123!',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('user');
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'John Doe',
          email: 'invalid-email',
          password: 'SecurePass123!',
        });

      expect(res.statusCode).toBe(400);
    });
  });
});
```

### **Run Tests**
```bash
# Run all tests
npm run test

# Run with coverage report
npm run test -- --coverage

# Watch mode (auto-rerun on changes)
npm run test:watch

# Run specific test file
npm run test -- tests/auth.test.js
```

### **Management E2E tests — run manually, not CI-gated**

`Management/e2e/` (Playwright) and `Services/e2e-tests/` (backend API E2E)
are **not** run by CI — `.github/workflows/microservices-ci.yml`'s
`management` job only runs lint + the Vitest/RTL unit suite. It's easy to
forget these exist. **Run `npm run test:e2e` in `Management/` locally before
merging any PR that touches Login, Sidebar, or Lead Management** — those are
the only areas this suite currently covers. See `Management/e2e/README.md`
and `Services/e2e-tests/README.md` for setup (both require the full backend
stack running locally via `cd Services && npm run dev`).

---

## 📚 Documentation

### **Update Documentation For**
- New features
- API endpoint changes
- Configuration changes
- Breaking changes
- Architecture decisions

### **Documentation Files to Update**
- `README.md` - Overview and quick start
- `Server/docs/` - Technical documentation
- Inline code comments - Complex logic
- API comments - Endpoint descriptions

### **Example Documentation**

```javascript
/**
 * Creates a new booking for a user
 * 
 * @param {string} userId - The ID of the user making the booking
 * @param {object} bookingData - Booking details
 * @param {string} bookingData.packageId - The package ID
 * @param {date} bookingData.startDate - Booking start date
 * @param {date} bookingData.endDate - Booking end date
 * @returns {Promise<object>} Created booking object
 * @throws {AppError} If booking data is invalid
 * 
 * @example
 * const booking = await createBooking('user123', {
 *   packageId: 'pkg456',
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-01-10'),
 * });
 */
const createBooking = async (userId, bookingData) => {
  // Implementation...
};
```

---

## 🆘 Getting Help

### **Questions?**
- Check documentation: `Server/docs/`
- Review existing issues on GitHub
- Ask in PR comments or discussions

### **Found a Bug?**
1. Check if issue already exists
2. Create new issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment info

### **Feature Request?**
1. Open issue with tag `[FEATURE REQUEST]`
2. Describe use case
3. Suggest implementation approach
4. Wait for feedback before starting work

---

## ✅ Contribution Checklist

Before submitting a PR, verify:

- [ ] Code follows project style guide
- [ ] All linting passes (`npm run lint`)
- [ ] All tests pass (`npm run test`)
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] Commit messages are clear
- [ ] No hardcoded secrets
- [ ] No debug console.logs
- [ ] PR description is complete
- [ ] Branched from `develop`, not `main`

---

## 🎉 Your First Contribution

### **Looking for Something Easy?**
- Issues tagged `good-first-issue`
- Issues tagged `help-wanted`
- Documentation improvements
- Test coverage expansion

### **Process for First-Time Contributors**
1. Comment on issue: "I'd like to work on this"
2. Get approval from maintainers
3. Follow development workflow
4. Submit PR with complete description
5. Respond to feedback gracefully
6. Celebrate your contribution! 🎉

---

## 📞 Community

- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Questions and ideas
- **Pull Requests** - Code contributions

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the ISC License.

---

## 🙏 Thank You!

We appreciate your contribution to Trip Sky Way! Whether it's code, documentation, or feedback, you're helping us build something great.

**Questions?** Feel free to ask in the issue or PR comments!

---

**Last Updated**: October 20, 2025  
**Version**: 1.0.0
