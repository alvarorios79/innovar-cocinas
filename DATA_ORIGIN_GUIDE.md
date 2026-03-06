# Data Origin Separation Guide

## Overview

This guide explains how to maintain strict separation between operational business data (`dataOrigin = 'manual'`) and system test data (`dataOrigin = 'system'`) throughout the application.

## Critical Rule

**System-generated test data must NEVER appear in the operational frontend used for business.**

## Implementation Rules

### 1. All Operational Queries Must Filter by `dataOrigin = 'manual'`

All queries that fetch data for display in the operational frontend must include:

```sql
WHERE dataOrigin = 'manual'
```

This applies to:
- **Projects**: `getAllProjects()`, `getAllProjectsPaginated()`
- **Quotations**: `getAllQuotations()`, `getAllQuotationsPaginated()`
- **Appointments**: `getAllAppointments()`, `getAllAppointmentsPaginated()`
- **Tasks**: `getAllTasks()`, `getAllTasksPaginated()`
- **Clients**: `getAllClients()`, `getAllClientsPaginated()`
- **Users**: `getAllUsers()`
- **Notifications**: All notification queries
- **Expenses**: `getAllExpenses()`, `getAllExpensesPaginated()`
- **Advisory Requests**: `getAllAdvisoryRequests()`

### 2. Automatic `dataOrigin` Assignment in Create Procedures

When creating records, use the `enforceDataOrigin()` helper function to automatically assign `dataOrigin = 'system'` if not specified:

```typescript
import { enforceDataOrigin } from '../db';

// In your create procedure:
const dataWithOrigin = enforceDataOrigin(input);
// dataWithOrigin.dataOrigin will be 'system' if not provided, otherwise uses the provided value
```

### 3. Data Origin Values

| Value | Purpose | Created By |
|-------|---------|-----------|
| `'manual'` | Real business data | Users via UI, real clients |
| `'system'` | Test/generated data | Scripts, generators, automated flows |

### 4. LIMPIEZA DE SISTEMA Module

The cleanup module displays and deletes only records where:

```sql
WHERE dataOrigin = 'system'
```

This ensures operational data is never affected by cleanup operations.

## Implementation Checklist

### Backend (server/db.ts)

- [x] Add `enforceDataOrigin()` helper function
- [x] Update all `getAll*()` functions to filter by `dataOrigin = 'manual'`
- [x] Update all `getAll*Paginated()` functions to filter by `dataOrigin = 'manual'`
- [x] Ensure all create procedures use `enforceDataOrigin()`

### Frontend

- [x] All operational dashboards automatically use filtered queries
- [x] LIMPIEZA DE SISTEMA module shows only system data

### Data Generators

- [ ] Ensure all test data generators explicitly set `dataOrigin = 'system'`
- [ ] Update seed scripts to use `dataOrigin = 'system'`
- [ ] Verify no generators create records without `dataOrigin`

## Usage Examples

### Creating a Record with Automatic dataOrigin

```typescript
import { enforceDataOrigin } from '../db';

// In a tRPC procedure:
create: protectedProcedure
  .input(z.object({
    name: z.string(),
    // dataOrigin is optional
    dataOrigin: z.enum(['manual', 'system']).optional()
  }))
  .mutation(async ({ input }) => {
    const db = await getDb();
    
    // Automatically set dataOrigin = 'system' if not provided
    const dataWithOrigin = enforceDataOrigin(input);
    
    return await db.insert(projects).values(dataWithOrigin);
  })
```

### Querying Operational Data

```typescript
// This automatically filters by dataOrigin = 'manual'
const projects = await getAllProjectsPaginated({
  page: 1,
  limit: 50,
  status: 'active'
});
```

### Querying System Data (LIMPIEZA DE SISTEMA only)

```typescript
// Explicitly query system data
const systemProjects = await db
  .select()
  .from(projects)
  .where(and(
    isNull(projects.deletedAt),
    eq(projects.dataOrigin, 'system')
  ));
```

## Testing Data Separation

### Test Case 1: Operational Dashboard Shows Only Manual Data

```typescript
// Create test data
const manualProject = await createProject({ dataOrigin: 'manual' });
const systemProject = await createProject({ dataOrigin: 'system' });

// Query operational data
const projects = await getAllProjects();

// Verify only manual data appears
expect(projects).toContainEqual(manualProject);
expect(projects).not.toContainEqual(systemProject);
```

### Test Case 2: Automatic dataOrigin Assignment

```typescript
// Create without specifying dataOrigin
const project = await createProject({ name: 'Test' });

// Verify it's marked as system data
expect(project.dataOrigin).toBe('system');
```

### Test Case 3: LIMPIEZA DE SISTEMA Shows Only System Data

```typescript
// Get system records count
const systemCount = await cleanup.getSystemRecordCounts();

// Verify only system records are counted
expect(systemCount.projects).toBeGreaterThan(0);
expect(systemCount.manual).toBeUndefined();
```

## Common Mistakes to Avoid

### ❌ Mistake 1: Forgetting dataOrigin Filter

```typescript
// BAD: This will include system data in operational view
const projects = await db.select().from(projects).where(isNull(projects.deletedAt));

// GOOD: Always filter by dataOrigin
const projects = await db
  .select()
  .from(projects)
  .where(and(isNull(projects.deletedAt), eq(projects.dataOrigin, 'manual')));
```

### ❌ Mistake 2: Not Using enforceDataOrigin

```typescript
// BAD: System data might be created without explicit origin
const project = await db.insert(projects).values(input);

// GOOD: Always enforce dataOrigin
const dataWithOrigin = enforceDataOrigin(input);
const project = await db.insert(projects).values(dataWithOrigin);
```

### ❌ Mistake 3: Mixing Operational and Test Queries

```typescript
// BAD: Querying all data including system records
const allProjects = await db.select().from(projects);

// GOOD: Use specific filtered queries
const operationalProjects = await getAllProjects(); // Only manual
const systemProjects = await cleanup.getSystemRecords('projects'); // Only system
```

## Maintenance

### When Adding New Tables

1. Add `dataOrigin` column to schema (if applicable)
2. Add filter to all `getAll*()` queries: `eq(table.dataOrigin, 'manual')`
3. Use `enforceDataOrigin()` in create procedures
4. Update LIMPIEZA DE SISTEMA to include the new table

### When Creating Data Generators

1. Always explicitly set `dataOrigin = 'system'`
2. Test that generated data doesn't appear in operational dashboards
3. Verify cleanup module can delete the generated data

## Questions?

Refer to the following files for implementation details:
- `server/db.ts` - Database helper functions and enforceDataOrigin()
- `server/routers/cleanup.ts` - LIMPIEZA DE SISTEMA procedures
- `client/src/pages/LimpiezaSistema.tsx` - Cleanup UI
