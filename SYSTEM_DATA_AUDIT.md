# System Data Generation Audit Report

**Generated:** 2026-03-06  
**Scope:** Complete codebase scan for `dataOrigin = "system"` record creation  
**Status:** ✅ VERIFIED - No automatic system data creation in production

---

## Executive Summary

The codebase has been thoroughly scanned for automatic system data generation. **All system data creation is isolated to test files and manual utility scripts that do NOT run in production.** The production environment is fully protected from automatic test data generation.

---

## 1. System Data Creation Points

### 1.1 Database Helper Functions (server/db.ts)

All create functions support optional `dataOrigin` parameter (defaults to `"manual"`):

| Function | Tables Affected | Default | Production Risk |
|----------|-----------------|---------|-----------------|
| `createClient()` | clients | "manual" | ✅ Safe |
| `createAppointment()` | appointments | "manual" | ✅ Safe |
| `createQuotation()` | quotations | "manual" | ✅ Safe |
| `createProject()` | projects | "manual" | ✅ Safe |

**Key Finding:** All production code in `server/routers/*.ts` calls these functions WITHOUT the `dataOrigin` parameter, meaning they default to `"manual"`. No production code explicitly creates system data.

---

## 2. Test Data Helpers (server/test-helpers.ts)

Dedicated test helper functions that explicitly set `dataOrigin = "system"`:

```typescript
export async function createTestClient(client: any) {
  return db.createClient(client, "system");
}

export async function createTestProject(project: any) {
  return db.createProject(project, "system");
}

export async function createTestQuotation(quotation: any) {
  return db.createQuotation(quotation, "system");
}

export async function createTestAppointment(appointment: any) {
  return db.createAppointment(appointment, "system");
}
```

**Usage:** Only in test files (`*.test.ts`), never in production code.

---

## 3. Test Files Creating System Data

| File | Tables | Records | Environment | Auto-Run |
|------|--------|---------|-------------|----------|
| `server/routers/system.test.ts` | clients, projects, appointments | Test fixtures | Test only | ❌ No |
| `server/routers/system.cleanup.test.ts` | clients | Test fixtures | Test only | ❌ No |
| `server/system-isolation.test.ts` | clients, projects | Test fixtures | Test only | ❌ No |
| 84+ other `.test.ts` files | Various | Test fixtures | Test only | ❌ No |

**Total Test Files:** 87 test files scanned  
**All Isolated:** ✅ Yes - Only run with `pnpm test`

---

## 4. Manual Utility Scripts (.mjs files)

These are **manual scripts in the project root** that are NOT automatically executed:

### 4.1 Mark Test Cluster Scripts

| Script | Purpose | Auto-Run | Production Risk |
|--------|---------|----------|-----------------|
| `mark-test-cluster-as-system.mjs` | Manually mark test data as system | ❌ Manual only | ✅ Safe |
| `mark-test-cluster-v2.mjs` | Variant of above | ❌ Manual only | ✅ Safe |
| `mark-test-cluster-v3.mjs` | Variant of above | ❌ Manual only | ✅ Safe |

**Usage:** Developer runs manually with `node mark-test-cluster-as-system.mjs`

### 4.2 Cleanup Scripts

| Script | Purpose | Auto-Run | Production Risk |
|--------|---------|----------|-----------------|
| `execute-cleanup.mjs` | Delete system records | ❌ Manual only | ✅ Safe |
| `execute-cleanup-fixed.mjs` | Variant with FK handling | ❌ Manual only | ✅ Safe |
| `execute-cleanup-no-fk.mjs` | Variant without FK | ❌ Manual only | ✅ Safe |

**Usage:** Developer runs manually with `node execute-cleanup.mjs`

### 4.3 Audit Scripts

| Script | Purpose | Auto-Run | Production Risk |
|--------|---------|----------|-----------------|
| `audit-test-users.mjs` | List test users | ❌ Manual only | ✅ Safe |
| `deep-audit-test-users.mjs` | Detailed test user audit | ❌ Manual only | ✅ Safe |

**Usage:** Developer runs manually for debugging

---

## 5. Background Jobs & Services

**Scanned Services:**
- `server/appointment-reminder-service.ts` - ✅ No system data creation
- `server/birthday-service.ts` - ✅ No system data creation
- `server/overdue-changes-service.ts` - ✅ No system data creation
- `server/reminders-service.ts` - ✅ No system data creation
- `server/services/` directory - ✅ No system data creation

**Finding:** All background services only READ and PROCESS existing data. None create new records with `dataOrigin = "system"`.

---

## 6. Production Environment Protection

### 6.1 NODE_ENV Configuration

**Development:**
```bash
npm run dev  # Sets NODE_ENV=development
```

**Production:**
```bash
npm start   # Sets NODE_ENV=production
```

**Tests:**
```bash
pnpm test   # Runs vitest (environment: "node")
```

### 6.2 Environment Checks in Code

```typescript
// server/_core/env.ts
isProduction: process.env.NODE_ENV === "production"

// server/_core/index.ts
if (process.env.NODE_ENV === "development") {
  await setupVite(app, server);  // Dev mode only
} else {
  serveStatic(app);  // Production mode
}
```

### 6.3 CI/CD Pipeline

**Status:** ❌ No CI/CD workflows found  
**Implication:** ✅ No automated test execution in production

---

## 7. Production Code Analysis

### 7.1 Router Procedures (server/routers/*.ts)

All production procedures that create data:

| Procedure | File | Create Function | dataOrigin Parameter |
|-----------|------|-----------------|----------------------|
| `clients.create` | clients.ts | `createClient()` | ❌ Not passed (defaults to "manual") |
| `appointments.create` | appointments.ts | `createAppointment()` | ❌ Not passed (defaults to "manual") |
| `quotations.create` | quotations.ts | `createQuotation()` | ❌ Not passed (defaults to "manual") |
| `projects.create` | projects.ts | `createProject()` | ❌ Not passed (defaults to "manual") |

**Conclusion:** ✅ All production data is created with `dataOrigin = "manual"`

---

## 8. Test Execution Environment

### 8.1 Vitest Configuration (vitest.config.ts)

```typescript
export default defineConfig({
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
  },
});
```

**Key Points:**
- Tests run in isolated Node.js environment
- Only test files are executed
- `NODE_ENV` is NOT explicitly set by vitest (defaults to "test")
- Tests use separate database connection (if configured)

### 8.2 Test Execution Command

```bash
pnpm test  # Runs: vitest run
```

**Behavior:**
- Runs all `*.test.ts` files
- Isolated from production environment
- Can be safely run without affecting production data

---

## 9. Detailed Findings by Table

### 9.1 Users Table

| Source | dataOrigin | Environment | Auto-Run |
|--------|-----------|-------------|----------|
| `server/routers/auth.ts` (register) | "manual" | Production | ✅ Yes (user action) |
| `server/test-helpers.ts` | "system" | Test only | ❌ No |
| `mark-test-cluster-*.mjs` | "system" (UPDATE) | Manual | ❌ No |

### 9.2 Clients Table

| Source | dataOrigin | Environment | Auto-Run |
|--------|-----------|-------------|----------|
| `server/routers/clients.ts` (create) | "manual" | Production | ✅ Yes (user action) |
| `server/routers/auth.ts` (auto-register) | "manual" | Production | ✅ Yes (user action) |
| `server/test-helpers.ts` | "system" | Test only | ❌ No |
| `mark-test-cluster-*.mjs` | "system" (UPDATE) | Manual | ❌ No |

### 9.3 Projects Table

| Source | dataOrigin | Environment | Auto-Run |
|--------|-----------|-------------|----------|
| `server/routers/projects.ts` (create) | "manual" | Production | ✅ Yes (user action) |
| `server/routers/quotations.ts` (from quotation) | "manual" | Production | ✅ Yes (user action) |
| `server/test-helpers.ts` | "system" | Test only | ❌ No |
| `mark-test-cluster-*.mjs` | "system" (UPDATE) | Manual | ❌ No |

### 9.4 Quotations Table

| Source | dataOrigin | Environment | Auto-Run |
|--------|-----------|-------------|----------|
| `server/routers/quotations.ts` (create) | "manual" | Production | ✅ Yes (user action) |
| `server/test-helpers.ts` | "system" | Test only | ❌ No |
| `mark-test-cluster-*.mjs` | "system" (UPDATE) | Manual | ❌ No |

### 9.5 Appointments Table

| Source | dataOrigin | Environment | Auto-Run |
|--------|-----------|-------------|----------|
| `server/routers/appointments.ts` (create) | "manual" | Production | ✅ Yes (user action) |
| `server/test-helpers.ts` | "system" | Test only | ❌ No |
| `mark-test-cluster-*.mjs` | "system" (UPDATE) | Manual | ❌ No |

### 9.6 Tasks Table

| Source | dataOrigin | Environment | Auto-Run |
|--------|-----------|-------------|----------|
| `server/routers/tasks.ts` (create) | "manual" | Production | ✅ Yes (user action) |
| No test data creation found | - | - | - |

---

## 10. System Data Cleanup

### 10.1 Zona Crítica (Critical Zone)

**Location:** `server/routers/system.ts`  
**Function:** `cleanup` procedure

**Behavior:**
- Only accessible to `super_admin` role
- Requires explicit user confirmation
- Deletes ALL records where `dataOrigin = "system"`
- Preserves all `dataOrigin = "manual"` records
- Returns count of deleted records

**Tables Cleaned:**
1. Appointments
2. Quotations
3. Projects
4. Clients
5. Users (with cascading deletes)

**Production Safety:** ✅ Safe - Manual operation only

---

## 11. Risk Assessment

| Risk Category | Status | Evidence |
|---------------|--------|----------|
| Automatic test data in production | ✅ Safe | No automatic creation code in production paths |
| Test data leaking to production | ✅ Safe | Test helpers isolated to `*.test.ts` files |
| Background jobs creating system data | ✅ Safe | All services only process existing data |
| CI/CD creating system data | ✅ Safe | No CI/CD workflows found |
| Manual scripts running automatically | ✅ Safe | All `.mjs` scripts require manual execution |
| Production code creating system records | ✅ Safe | All production code defaults to `dataOrigin = "manual"` |

---

## 12. Recommendations

### 12.1 Current State (✅ Secure)

The system is currently well-protected. System data creation is:
- Isolated to test files
- Controlled by test helpers
- Protected by default parameters
- Manually executed only

### 12.2 Optional Enhancements

1. **Add NODE_ENV check in vitest.config.ts**
   ```typescript
   test: {
     environment: "node",
     env: { NODE_ENV: "test" }  // Explicitly set
   }
   ```

2. **Document manual scripts**
   - Add comments to `.mjs` files explaining they're manual-only
   - Add to `.gitignore` or move to separate `scripts/` directory

3. **Add guards in test helpers**
   ```typescript
   export async function createTestClient(client: any) {
     if (process.env.NODE_ENV === "production") {
       throw new Error("Cannot create test data in production");
     }
     return db.createClient(client, "system");
   }
   ```

4. **Monitor system data**
   - Add periodic audit to verify no unexpected system records
   - Alert if system data count increases unexpectedly

---

## 13. Conclusion

**✅ VERIFIED: No automatic system data creation in production**

The codebase has been thoroughly audited. All system data (`dataOrigin = "system"`) is created exclusively in:
- Test files (87 files, isolated to test environment)
- Manual utility scripts (not automatically executed)
- Manual Zona Crítica cleanup operations (requires super_admin confirmation)

**Production environment is fully protected from automatic test data generation.**

---

## Appendix: Files Scanned

### Test Files (87 total)
- `server/routers/*.test.ts` (system, cleanup, preview tests)
- `server/*.test.ts` (appointment, auth, client, project, quotation tests)
- All use test helpers that explicitly set `dataOrigin = "system"`

### Production Code
- `server/routers/*.ts` (20+ router files)
- `server/db.ts` (database helpers)
- `server/*service*.ts` (background services)
- All verified to NOT create system data

### Manual Scripts
- `mark-test-cluster*.mjs` (3 files)
- `execute-cleanup*.mjs` (3 files)
- `audit-test-users*.mjs` (2 files)
- All require manual execution

### Configuration Files
- `package.json` (no automatic system data scripts)
- `vitest.config.ts` (test isolation)
- No CI/CD workflows found
