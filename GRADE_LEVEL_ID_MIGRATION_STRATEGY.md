# Grade → GradeLevel Normalization: Data Migration Strategy & Rollback

**Scope:** Phase 2 of grade structure normalization (Phase 1 = `grade_levels` master
table + `schools.from_grade_id`/`to_grade_id`, documented in
`GRADE_MANAGEMENT_STANDARDIZATION.md`). This phase adds the authoritative FK link
from each school's grade/section mapping (`grades` table) to the standardized
master (`grade_levels`), replacing ad-hoc string comparison with a real
relationship while keeping every existing string-based read path working
unchanged.

Migration file:
`Backend/NubeEra.Infrastructure/Persistence/Migrations/20260616130000_AddGradeLevelIdToGrades.cs`

Rollback script (standalone, outside EF tooling):
`rollback_grade_level_id_migration.sql`

---

## 1. What Changes

| Object | Change |
|---|---|
| `grades.GradeLevelId` | **New** nullable `char(36)` column, FK → `grade_levels.Id`, `ON DELETE RESTRICT` |
| `IX_grades_GradeLevelId` | **New** index on the FK column |
| `grades.GradeLevel` (string) | **Unchanged.** Stays as a kept-in-sync cache column. |
| `grades.GradeName` (string) | **Unchanged.** Stays as a kept-in-sync cache column. |
| Existing FKs/indexes/constraints on `grades` | **Unchanged** (`CK_grades_GradeLevel_1_to_10`, `IX_grades_SchoolId_GradeLevel_AcademicYear`, `FK` to `schools`/`teachers`) |

This is **purely additive** — no column is dropped, renamed, or retyped, and no
existing row is deleted. The migration is safe to run against a live database
with existing data and existing application traffic (aside from the brief table
lock MySQL takes for `ALTER TABLE ... ADD COLUMN`).

---

## 2. Why a Hybrid (Cache + FK) Design

Going straight to "drop the string columns, make `GradeLevelId` the only source
of truth" would force every read path (reports, exports, legacy API consumers,
any raw SQL/BI queries against `grades.GradeLevel`) to be rewritten and verified
in the same change. Instead:

- `GradeLevelId` becomes the **authoritative** link for new writes and for any
  code that needs the canonical name/order/display metadata from `grade_levels`.
- `GradeLevel`/`GradeName` remain as **derived cache columns**, written by
  `GradeService` from the resolved master row on every create/update
  (see `ResolveGradeLevelAsync` in `GradeService.cs`). They are never written
  independently of `GradeLevelId` going forward.
- Every existing query, report, export column, and the unique index
  `(SchoolId, GradeLevel, AcademicYear)` keep working without modification.

This lets normalization land safely now, with denormalized-column removal as an
optional, fully separate future cleanup once every consumer has been migrated to
read `GradeLevelId`/the `grade_levels` join (not required by current scope).

---

## 3. Backfill Logic

`grades.GradeLevel` is a string ("1".."10", optionally ordinal-suffixed: "1st"
.."10th" — enforced today by `CK_grades_GradeLevel_1_to_10`). `grade_levels` rows
use the deterministic seed GUID scheme already established in Phase 1:

```
LevelNumber 1  -> 00000000-0000-0000-0000-000000000001
LevelNumber 2  -> 00000000-0000-0000-0000-000000000002
...
LevelNumber 9  -> 00000000-0000-0000-0000-000000000009
LevelNumber 10 -> 00000000-0000-0000-0000-000000000010
```

The migration's backfill (run inside `Up()`, after the column/index are added,
before the FK is created) maps every existing row in one statement:

```sql
UPDATE `grades`
SET `GradeLevelId` = CASE
    WHEN `GradeLevel` REGEXP '^10' THEN '00000000-0000-0000-0000-000000000010'
    WHEN `GradeLevel` REGEXP '^[1-9]' THEN CONCAT('00000000-0000-0000-0000-00000000000', LEFT(`GradeLevel`, 1))
    ELSE NULL
END
WHERE `GradeLevelId` IS NULL;
```

The "10"/"10th" branch is checked first specifically so the generic
single-digit branch never misreads the leading "1" of "10" as level 1. Because
the existing CHECK constraint already guarantees `GradeLevel` matches
`^(10|[1-9])(st|nd|rd|th)?$`, every row should match one of the two branches and
end up with a non-null `GradeLevelId`. The `ELSE NULL` branch exists only as a
safety net for any row that somehow predates/bypasses the CHECK constraint; the
FK is added immediately after, so if any row remains unmapped it will simply
have `GradeLevelId IS NULL` (FK is nullable/optional, so this does not block the
migration) and surfaces in the verification query in section 4.

---

## 4. Verification Queries

Run these **before** applying the migration to baseline row counts, and **after**
to confirm a clean backfill.

### 4.1 Pre-migration baseline

```sql
-- Total grade rows that will need a GradeLevelId
SELECT COUNT(*) AS total_grades FROM `grades`;

-- Distribution of legacy GradeLevel values (sanity check before backfill)
SELECT `GradeLevel`, COUNT(*) AS row_count
FROM `grades`
GROUP BY `GradeLevel`
ORDER BY row_count DESC;

-- Any row that does NOT match the expected legacy pattern (should be 0,
-- guaranteed by CK_grades_GradeLevel_1_to_10, but confirm before migrating)
SELECT * FROM `grades`
WHERE `GradeLevel` NOT REGEXP '^(10|[1-9])(st|nd|rd|th)?$';
```

### 4.2 Post-migration verification

```sql
-- 1. Every grade_levels row referenced by grades must exist (FK already
--    guarantees this going forward, but confirm no orphans on first run)
SELECT g.Id, g.GradeLevel, g.GradeLevelId
FROM `grades` g
LEFT JOIN `grade_levels` gl ON gl.Id = g.GradeLevelId
WHERE g.GradeLevelId IS NOT NULL AND gl.Id IS NULL;
-- Expect: 0 rows

-- 2. Any row that failed to backfill (manual follow-up required if > 0)
SELECT * FROM `grades` WHERE `GradeLevelId` IS NULL;
-- Expect: 0 rows

-- 3. Cross-check: GradeLevelId's LevelNumber must match the legacy GradeLevel
--    string it was derived from (catches a logic error in the CASE mapping)
SELECT g.Id, g.GradeLevel AS legacy_string, gl.LevelNumber AS mapped_number
FROM `grades` g
INNER JOIN `grade_levels` gl ON gl.Id = g.GradeLevelId
WHERE gl.LevelNumber != CAST(LEFT(g.GradeLevel, IF(g.GradeLevel REGEXP '^10', 2, 1)) AS UNSIGNED);
-- Expect: 0 rows

-- 4. Row count is unchanged (no rows lost/duplicated)
SELECT COUNT(*) AS total_grades_after FROM `grades`;
-- Expect: same value as the pre-migration baseline (4.1)

-- 5. Section relationships intact (gradesections still point at valid grades)
SELECT COUNT(*) AS orphaned_sections
FROM `gradesections` gs
LEFT JOIN `grades` g ON g.Id = gs.GradeId
WHERE g.Id IS NULL;
-- Expect: 0 rows (this migration never touches gradesections or grades.Id)
```

If query 2 returns any rows, those are pre-existing data quality issues (a
`GradeLevel` value that bypassed the CHECK constraint, e.g. inserted via direct
SQL) — resolve manually by setting the correct `GradeLevelId` for those specific
rows; do not re-run the migration.

---

## 5. Rollback Procedure

### Option A — EF Core (preferred, if `dotnet ef` is available)

```bash
dotnet ef database update 20260614134643_AddGradeSections \
  --project Backend/NubeEra.Infrastructure \
  --startup-project Backend/NubeEra.API
```

This runs the migration's own `Down()`, which drops the FK, the index, and the
`GradeLevelId` column — in that order, which is required because MySQL will not
let you drop a column that still has an FK or index attached to it.

### Option B — Standalone SQL (no EF tooling required)

Run `rollback_grade_level_id_migration.sql` (repo root) directly against the
database, e.g. via MySQL Workbench or `mysql` CLI. It performs the exact inverse
of the migration's `Up()`:

1. Drop `FK_grades_grade_levels_GradeLevelId`
2. Drop `IX_grades_GradeLevelId`
3. Drop the `GradeLevelId` column

No data is lost by rolling back: `GradeLevel`/`GradeName` string columns (the
columns every existing read path actually uses) are untouched by both the
forward migration and this rollback. The only consequence of rolling back is
losing the `GradeLevelId` link itself, which can always be regenerated by
re-running the forward migration's backfill logic, since the GUID scheme is
deterministic.

If you roll back **after** the backend has already started accepting
`GradeLevelId` on create/update requests, also revert
`Backend/NubeEra.Infrastructure/Migrations/AppDbContextModelSnapshot.cs` and the
application-layer changes listed in section 6, or redeploy the previous backend
build — otherwise EF's runtime model will expect a column that no longer exists.

---

## 6. Application-Layer Changes Shipped Alongside This Migration

These are not part of the SQL migration itself but are required for the new
column to be usable end-to-end; listed here so a rollback decision accounts for
the full surface area:

- `Backend/NubeEra.Domain/Entities/Grade.cs` — `GradeLevelId`/`Level` nav added
- `Backend/NubeEra.Domain/Entities/GradeLevel.cs` — inverse `Grades` collection added
- `Backend/NubeEra.Infrastructure/Persistence/Configurations/GradeConfiguration.cs` — FK/index config added
- `Backend/NubeEra.Infrastructure/Migrations/AppDbContextModelSnapshot.cs` — synced
- `Backend/NubeEra.Application/DTOs/Schools/GradeDtos.cs` — `GradeLevelId` added to all 3 DTOs
- `Backend/NubeEra.Application/Validators/GradeValidator.cs` — dual-path (`GradeLevelId` OR `GradeLevel`) validation
- `Backend/NubeEra.Application/Services/GradeService.cs` — `ResolveGradeLevelAsync` resolution + cache-column sync
- `Backend/NubeEra.Application/Mappings/SchoolMappingProfile.cs` — new fields explicitly ignored (service-resolved)
- `Frontend/src/modules/schools/pages/Grades.tsx` — captures `GradeLevelOption.id` from `GradeLevelSelect` and submits it as `grade_level_id`
- `Backend/NubeEra.Infrastructure/Persistence/Seed/AdminSeeder.cs` — the two places that construct `Grade` rows directly (bypassing `GradeService`, so they don't get `ResolveGradeLevelAsync`'s automatic resolution) now also set `GradeLevelId` from the same deterministic `GradeLevelConfiguration.GradeLevelSeedIds` array already used for `School.FromGradeId`/`ToGradeId` in this file. Without this, grades seeded on a **fresh** database (after the migration's one-time backfill has already run) would have permanently kept `GradeLevelId = NULL`, since the backfill only covers rows that existed at migration time.

All of the above are backward compatible in isolation: `GradeLevelId` is
optional everywhere (nullable DTO field, nullable DB column, validator accepts
either field), so existing API clients that only ever send the legacy
`GradeLevel` string continue to work without any change.

---

## 7. Regression Testing Checklist

- [ ] **Schema**: `grades.GradeLevelId` exists as nullable `char(36)`, `IX_grades_GradeLevelId` exists, `FK_grades_grade_levels_GradeLevelId` exists with `ON DELETE RESTRICT`
- [ ] **Backfill**: run section 4.2 query 2 — zero rows with `GradeLevelId IS NULL` after migration on a non-trivial existing dataset
- [ ] **Backfill correctness**: run section 4.2 query 3 — zero mismatches between legacy `GradeLevel` and the mapped `grade_levels.LevelNumber`
- [ ] **No data loss**: row counts for `grades` and `gradesections` unchanged pre/post migration
- [ ] **Create grade (legacy clients)**: POST `/grades` with only `GradeLevel` ("5") — succeeds, `GradeLevelId` is auto-resolved and populated
- [ ] **Create grade (new clients)**: POST `/grades` with only `GradeLevelId` (a `grade_levels.Id`) — succeeds, `GradeLevel`/`GradeName` cache columns populated correctly
- [ ] **Create grade (both supplied, consistent)**: succeeds
- [ ] **Create grade (neither supplied)**: rejected with "Either a grade level selection or a grade level value is required."
- [ ] **Create grade (invalid `GradeLevelId`)**: rejected with "Grade level must be a standardized value between 1 and 10."
- [ ] **Create grade (out-of-range `GradeLevel`, e.g. "11")**: rejected (existing validator rule, unchanged)
- [ ] **Create grade (level outside school's From/To range)**: still rejected via `GradeAccessService.EnsureLevelNumberAllowedAsync` (Phase 1 behavior unchanged)
- [ ] **Update grade**: same matrix as create, plus confirm changing `GradeLevelId` correctly updates the cached `GradeLevel`/`GradeName` strings
- [ ] **GET endpoints** (`GetAll`, `GetById`, `GetBySchool`, `GetAccessible`, `Export`): `GradeLevelId` present in response DTOs; legacy `GradeLevel`/`GradeName` fields unchanged in shape/value
- [ ] **Frontend — Super Admin / Admin / Staff**: grade dropdowns load from `grade_levels` master, unaffected by `SchoolId`
- [ ] **Frontend — Grades.tsx**: create and edit a grade through the UI; confirm `grade_level_id` is sent in the payload and the edit form repopulates it correctly
- [ ] **Frontend — section dropdowns**: remain school-specific (no regression — untouched by this change)
- [ ] **Cross-module reads** (Students, Exams, Modules, Schedulers, Reports): grade filters/joins via the existing `GradeId`/`GradeLevel` string still resolve correctly — these modules were not touched and do not reference `GradeLevelId`
- [ ] **IDOR / access checks**: `GradeAccessService` behavior (range filtering, cross-school rejection) unchanged — confirm existing `GradeAccessServiceTests` scenarios still pass conceptually (no production code in that service was modified)
- [ ] **Rollback drill** (staging only): apply `rollback_grade_level_id_migration.sql`, confirm app still functions on legacy `GradeLevel`-only paths, then re-apply the forward migration and confirm backfill reproduces identical `GradeLevelId` values
- [ ] **AppDbContextModelSnapshot**: diff reviewed — additive only (new property, new index, new relationship/navigation entries), no unrelated entity changed
- [ ] **Fresh-database seed**: run `AdminSeeder` against a brand-new database (migrations already applied) and confirm every seeded `grades` row (`NubeEra School` 1st–10th, default school Grade 1/Grade 10) has a non-null `GradeLevelId` matching its `GradeLevel`

---

## 8. Files Added/Modified For This Phase

**New**
- `Backend/NubeEra.Infrastructure/Persistence/Migrations/20260616130000_AddGradeLevelIdToGrades.cs`
- `GRADE_LEVEL_ID_MIGRATION_STRATEGY.md` *(this file)*
- `rollback_grade_level_id_migration.sql`

**Modified**
- `Backend/NubeEra.Domain/Entities/Grade.cs`
- `Backend/NubeEra.Domain/Entities/GradeLevel.cs`
- `Backend/NubeEra.Infrastructure/Persistence/Configurations/GradeConfiguration.cs`
- `Backend/NubeEra.Infrastructure/Migrations/AppDbContextModelSnapshot.cs`
- `Backend/NubeEra.Application/DTOs/Schools/GradeDtos.cs`
- `Backend/NubeEra.Application/Validators/GradeValidator.cs`
- `Backend/NubeEra.Application/Services/GradeService.cs`
- `Backend/NubeEra.Application/Mappings/SchoolMappingProfile.cs`
- `Frontend/src/modules/schools/pages/Grades.tsx`
