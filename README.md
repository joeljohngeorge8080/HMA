# Branch Naming Convention

All branches must include the contributor's name.

Format:

```text
<type>/<name>/<short-description>
```

Examples:

## Features

```text
feature/joel/attendance-dashboard
feature/arjun/student-search
feature/alex/auth-improvements
```

## Bug Fixes

```text
fix/joel/login-validation
fix/arjun/attendance-calculation
```

## Documentation

```text
docs/joel/api-documentation
docs/arjun/setup-guide
```

## Refactoring

```text
refactor/joel/auth-service
refactor/alex/database-layer
```

## Testing

```text
test/joel/auth-tests
test/arjun/attendance-module
```

### Rules

* Use lowercase letters only.
* Use hyphens (`-`) instead of spaces.
* Include your name in every branch.
* Create a new branch for each task or feature.
* Do not reuse old branches for unrelated work.

### Branch Ownership

The contributor who creates the branch is responsible for:

* Keeping it up to date with `main`.
* Resolving merge conflicts.
* Addressing review comments.
* Maintaining code quality before requesting review.

# Contributing Guide

## Branch Protection Policy

The `main` branch is protected.

* Do **not** push directly to `main`.
* All changes must be made through a Pull Request (PR).
* All Pull Requests require review and approval before merging.
* Only repository administrators can bypass branch protection rules when necessary.

---

## Development Workflow

### 1. Sync your local repository

```bash
git checkout main
git pull origin main
```

### 2. Create a new branch

Create a branch from the latest version of `main`.

```bash
git checkout -b feature/your-feature-name
```

### 3. Make your changes

Commit changes in small, meaningful commits.

```bash
git add .
git commit -m "feat: add attendance analytics"
```

### 4. Push your branch

```bash
git push origin feature/your-feature-name
```

### 5. Create a Pull Request

Create a Pull Request from:

```text
feature/your-feature-name → main
```

Provide:

* Clear title
* Description of changes
* Screenshots (if applicable)
* Testing notes

### 6. Review Process

* Address review comments promptly.
* Push fixes to the same branch.
* Do not create a new PR for review changes.

### 7. Merge

Repository maintainers will merge approved Pull Requests.

---

# Branch Naming Convention

Use the following branch prefixes:

## Features

```text
feature/attendance-dashboard
feature/student-search
feature/auth-improvements
```

## Bug Fixes

```text
fix/login-validation
fix/attendance-calculation
```

## Documentation

```text
docs/api-documentation
docs/setup-guide
```

## Refactoring

```text
refactor/auth-service
refactor/database-layer
```

## Testing

```text
test/auth-tests
test/attendance-module
```

---

# Commit Message Convention

Use Conventional Commits.

## Feature

```text
feat: add attendance analytics page
```

## Bug Fix

```text
fix: resolve duplicate attendance entries
```

## Documentation

```text
docs: update installation instructions
```

## Refactoring

```text
refactor: simplify attendance calculation logic
```

## Testing

```text
test: add attendance service unit tests
```

## Chore

```text
chore: update dependencies
```

---

# Pull Request Requirements

Before opening a Pull Request:

* Code builds successfully.
* No unnecessary files are committed.
* Documentation is updated when required.
* Tests pass.
* Branch is up to date with `main`.

---

# Files That Must Never Be Committed

Do not commit:

```text
node_modules/
dist/
build/
.venv/
venv/
__pycache__/
.env
.env.local
*.log
```

Use `.gitignore` appropriately.

---

# Code Quality Expectations

* Write readable code.
* Avoid unnecessary complexity.
* Keep functions focused on a single responsibility.
* Use meaningful variable and function names.
* Follow existing project structure and coding style.

---

# Communication

If a change is large, architectural, or impacts multiple modules:

1. Open an issue first.
2. Discuss the approach.
3. Obtain approval before implementation.

This prevents unnecessary rework and keeps development aligned with project goals.
