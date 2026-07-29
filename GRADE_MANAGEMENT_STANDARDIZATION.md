# Grade Management Standardization — Implementation Summary

**Scope:** System-wide redesign so the LMS supports exactly grades **1st–10th** as
system-defined master data, with each school configuring its own supported
**From Grade → To Grade** range, enforced everywhere through one centralized,
cached, fail-closed access layer.

---

## 1. Database Changes

### New table: `grade_levels`
The single, system-defined master list — 10 immutable rows, seeded with deterministic
GUIDs (`00000000-0000-0000-0000-00000000000{1-10}`) so the seed is stable across
every environment:

| Column | Type | Notes |
|---|---|---|
| `Id` | char(36) | PK |
| `LevelNumber` | int | 1–10, **unique index** |
| `Name` | varchar(50) | "1st Grade" … "10th Grade" |
| `DisplayOrder` | int | sort order |
| `IsActive` | tinyint(1) | default `true` |
| `CreatedAt` | datetime(6) | |

### `schools` table — two new nullable FK columns
- `from_grade_id` (char(36), FK → `grade_levels.Id`, `ON DELETE RESTRICT`)
- `to_grade_id` (char(36), FK → `grade_levels.Id`, `ON DELETE RESTRICT`)
- Indexes: `IX_schools_from_grade_id`, `IX_schools_to_grade_id`

Nullable at the DB level (so existing rows migrate cleanly) but **required at
activation time** — enforced in `SchoolCreateDto`/`SchoolUpdateDto` validators and
`GenericSchoolService` (a school cannot be activated without a valid 1–10,
From ≤ To range).

### Migration
`Backend/NubeEra.Infrastructure/Persistence/Migrations/20260608150000_AddGradeLevelsAndSchoolGradeRange.cs`

Hand-written EF Core migration (no `.Designer.cs` companion — this sandbox has no
.NET SDK to scaffold one; followed the established in-repo precedent
`AddBackupRestoreModule.cs`, which uses `[DbContext]`/`[Migration]` attributes that
`Database.Migrate()` discovers and applies at startup with no `dotnet ef` step
required).

**Generate and apply status:** Generated ✅. Applies automatically — `Program.cs`
calls `db.Database.Migrate()` on every backend startup, so the table, columns,
indexes, FKs, and 10-row seed are created the next time the API runs. No manual
`dotnet ef database update` is required.

One follow-up recommended for whoever next has SDK access: run
`dotnet ef migrations add SyncGradeLevelModelSnapshot` once, to regenerate the
scaffolded model snapshot for future `migrations add` diffs (it should produce an
empty Up/Down if this migration is consistent with the model — which it is, having
been cross-checked line-for-line against `GradeLevelConfiguration` and
`AdminSeeder`).

---

## 2. Domain & Entity Changes

- **`GradeLevel`** (new entity): `LevelNumber`, `Name`, `DisplayOrder`, `IsActive`,
  nav collections `SchoolsWithFromGrade` / `SchoolsWithToGrade`.
- **`School`**: added `FromGradeId` / `ToGradeId` (`Guid?`) with FK relations
  (`DeleteBehavior.Restrict`).
- **`GradeAccessForbiddenException`** (new): thrown by the centralized service for
  every denied-access path (out-of-range level, cross-school IDOR attempt).

---

## 3. Centralized Access Layer (single source of truth)

### `IGradeAccessService` / `GradeAccessService`
- `GetAllGradeLevelsAsync()` — full standardized master list
- `GetAllowedGradeLevelsAsync(schoolId)` — master list filtered to a school's range
- `GetAllowedGradeLevelsForCurrentUserAsync()` — resolves the caller's school
  automatically (platform roles `SuperAdmin`/`Admin` get the unfiltered master)
- `IsLevelNumberAllowedAsync(schoolId, levelNumber)` / `EnsureLevelNumberAllowedAsync(...)`
- `EnsureGradeAccessibleToCurrentUserAsync(gradeId)` — the IDOR gate: verifies
  **both** that the grade's level is inside its school's configured range **and**
  that the grade belongs to the caller's own school
- Fail-closed: an unconfigured/invalid range returns an empty list / `false` /
  throws — never silently exposes grades
- Cached via `IMemoryCache`: master list 6 hours, per-school allowed list derived
  from the range cache

### `ISchoolGradeRangeService` / `SchoolGradeRangeService`
- `GetRangeAsync(schoolId)` → `GradeRange? { From, To }`, normalized with
  `Math.Min`/`Math.Max` so a misconfigured From > To never breaks downstream logic
- 30-minute per-school cache + `InvalidateCache(schoolId)` (called whenever a
  school's range is edited)

Both registered in `NubeEra.Application.DependencyInjection` /
`NubeEra.Infrastructure.DependencyInjection`.

---

## 4. Validation Rules (enforced server-side)

- From Grade and To Grade must each be one of the 10 standardized levels (1–10)
- From Grade ≤ To Grade
- A school **cannot be activated** (`IsActive = true`) without both bounds set and
  valid — enforced in `SchoolCreateDto`/`SchoolUpdateDto` validators
  (`SchoolGradeRangeValidators.cs`) and re-checked in `GenericSchoolService`

---

## 5. API / Controller Changes

- **`GradeLevelsController`** (new): exposes
  `GET /api/grade-levels` (current user's allowed list) and
  `GET /api/grade-levels/master` (full standardized list, Principal+ only — used
  solely by Academic Setup screens like the School From/To Grade pickers)
- **`GradeService`**, **`StudentService`**, **`StudentPromotionService`**,
  **`AttendanceService`**, **`ExamService`**, **`ModuleService`**,
  **`SchedulerService`**, **`StudentsController`**, **`TeachersController`** — all
  updated to resolve grade visibility exclusively through `GradeAccessService`
  before returning, filtering, or accepting grade-scoped data, so:
  - dropdowns/filters/search panels/report filters never list out-of-range grades
  - direct API calls referencing an out-of-range or cross-school `GradeId` are
    rejected with `GradeAccessForbiddenException` (mapped to `403 Forbidden` in
    `ExceptionHandlingMiddleware`)
- **`GenericSchoolService`** — owns the From/To Grade activation gate and calls
  `SchoolGradeRangeService.InvalidateCache(schoolId)` on every range edit

---

## 6. Frontend Changes

### `GradeLevelSelect` (new reusable component) — `Frontend/src/components/GradeLevelSelect.tsx`
The single dropdown component every grade picker in the app must use:
- `source="allowed"` (default) — the caller's school-scoped range, fetched from
  `/api/grade-levels`; used in registration, attendance, exams, timetable, learning
  modules, events, report filters, etc.
- `source="master"` — the full 1–10 master list from `/api/grade-levels/master`;
  reserved for Academic Setup screens (School From/To Grade pickers)
- Module-level cache + `invalidateGradeLevelCaches()` (called after a school's
  range is edited) to minimize redundant network calls
- Emits either the `LevelNumber` (matches `Grade.GradeLevel` convention) or the
  entity `Id`, via `valueAs`

### Pages updated to consume it
- `Schools.tsx` — added "Standardized Grade Range" From/To Grade fields (both
  `source="master"`) with client-side From ≤ To validation mirroring the backend
- `Grades.tsx`, `Students.tsx`, `Teachers.tsx` — replaced every hardcoded grade
  array/range (e.g. `[...Array(12)]`) with `<GradeLevelSelect source="allowed" />`
- `types/index.ts` / `services/api.ts` — added `GradeLevelOption` types and the
  `/grade-levels` API bindings

---

## 7. Security / IDOR Prevention

`EnsureGradeAccessibleToCurrentUserAsync` is the mandatory gate before any
grade-scoped read or write reachable by `GradeId`. It throws
`GradeAccessForbiddenException` (→ HTTP 403) when:

1. The grade's `LevelNumber` falls outside its **own school's** configured range
   (e.g. a legacy Grade-1 row surviving a range narrowed to 6–10), or
2. The grade belongs to a **different school** than the authenticated,
   school-scoped user — blocking the classic IDOR pattern of swapping a valid
   `GradeId` from another tenant into a request

Reports and list endpoints additionally pre-filter through
`GetAllowedGradeLevelsAsync`/`GetAllowedGradeLevelsForCurrentUserAsync`, so
out-of-range grades are never serialized in the first place — defense in depth
against both UI-level leakage and direct API probing.

---

## 8. Testing

New suite: `Backend/NubeEra.Tests/GradeManagement/GradeAccessServiceTests.cs`
(xUnit + Moq + FluentAssertions + EF Core InMemory, following the
`BackupServiceTests` conventions). Scenarios covered:

| Scenario | What it proves |
|---|---|
| Full range 1–10 | All 10 standardized grades visible |
| Partial ranges 6–10, 1–5, 3–8 | Only the configured slice is visible; everything else hidden |
| No / null range configured | **Fails closed** — zero grades exposed |
| Boundary checks (`IsLevelNumberAllowedAsync`) | Lower/upper bounds allowed; one-below/one-above and out-of-master (11) denied |
| `EnsureLevelNumberAllowedAsync` | Throws `GradeAccessForbiddenException` for an out-of-range level |
| IDOR — grade outside its own school's range | Throws, even though the `GradeId` is real (legacy row after range narrowed) |
| IDOR — grade belongs to a different school | Throws for a school-scoped user referencing another tenant's valid `GradeId` |
| IDOR — valid same-school, in-range grade | Succeeds (no false positives) |
| Range narrowed after data existed | Legacy out-of-range rows become inaccessible |
| Platform roles (SuperAdmin) | See the unfiltered master list regardless of school context |
| School-scoped role resolution | `GetAllowedGradeLevelsForCurrentUserAsync` correctly derives the caller's school and range |

**Run status:** This sandbox has no .NET SDK (`dotnet` unavailable, package
install blocked, network-restricted SDK download returns 403 — confirmed in two
independent checks this session). The suite was therefore validated by full static
review instead: every constructor signature, `DbSet` name, namespace, role
constant, and entity property referenced was cross-checked against the live source
(`GradeAccessService`, `SchoolGradeRangeService`, `AppDbContext`, `AppRoles`,
`School`, `Grade`, `GradeLevel`, `GenericRepository<T>`,
`GradeAccessForbiddenException`) — no mismatches found; the suite is ready to run
with `dotnet test` once the SDK is available.

---

## 9. Files Modified / Added

**Backend — Domain / Entities**
- `Backend/NubeEra.Domain/Entities/School.cs`
- `Backend/NubeEra.Domain/Entities/GradeLevel.cs` *(new)*
- `Backend/NubeEra.Domain/Common/GradeAccessForbiddenException.cs` *(new)*

**Backend — Application (Services / DTOs / Interfaces / Validators / DI)**
- `Backend/NubeEra.Application/Services/GradeService.cs`
- `Backend/NubeEra.Application/Services/GradeAccessService.cs` *(new)*
- `Backend/NubeEra.Application/Services/SchoolGradeRangeService.cs` *(new)*
- `Backend/NubeEra.Application/Services/GenericSchoolService.cs`
- `Backend/NubeEra.Application/Services/StudentService.cs`
- `Backend/NubeEra.Application/Services/StudentPromotionService.cs`
- `Backend/NubeEra.Application/Services/AttendanceService.cs`
- `Backend/NubeEra.Application/Services/ExamService.cs`
- `Backend/NubeEra.Application/Services/ModuleService.cs`
- `Backend/NubeEra.Application/Services/SchedulerService.cs`
- `Backend/NubeEra.Application/Interfaces/Services/IGradeAccessService.cs` *(new)*
- `Backend/NubeEra.Application/Interfaces/Services/ISchoolGradeRangeService.cs` *(new)*
- `Backend/NubeEra.Application/DTOs/GradeLevelDtos.cs` *(new)*
- `Backend/NubeEra.Application/DTOs/SchoolCreateDto.cs`
- `Backend/NubeEra.Application/Validators/SchoolGradeRangeValidators.cs` *(new)*
- `Backend/NubeEra.Application/DependencyInjection.cs`

**Backend — Infrastructure (Configurations / Migrations / Seed / DI)**
- `Backend/NubeEra.Infrastructure/Persistence/Configurations/SchoolConfiguration.cs`
- `Backend/NubeEra.Infrastructure/Persistence/Configurations/GradeLevelConfiguration.cs` *(new)*
- `Backend/NubeEra.Infrastructure/Persistence/DbContext/AppDbContext.cs`
- `Backend/NubeEra.Infrastructure/Persistence/Seed/AdminSeeder.cs`
- `Backend/NubeEra.Infrastructure/Persistence/Migrations/20260608150000_AddGradeLevelsAndSchoolGradeRange.cs` *(new)*
- `Backend/NubeEra.Infrastructure/Migrations/AppDbContextModelSnapshot.cs`
- `Backend/NubeEra.Infrastructure/DependencyInjection.cs`

**Backend — API (Controllers / Middleware)**
- `Backend/NubeEra.API/Controllers/School/GradeLevelsController.cs` *(new)*
- `Backend/NubeEra.API/Controllers/People/StudentsController.cs`
- `Backend/NubeEra.API/Controllers/People/TeachersController.cs`
- `Backend/NubeEra.API/Middleware/ExceptionHandlingMiddleware.cs`

**Backend — Tests**
- `Backend/NubeEra.Tests/GradeManagement/GradeAccessServiceTests.cs` *(new)*

**Frontend**
- `Frontend/src/components/GradeLevelSelect.tsx` *(new — reusable selector)*
- `Frontend/src/pages/Grades.tsx`
- `Frontend/src/pages/Students.tsx`
- `Frontend/src/pages/Teachers.tsx`
- `Frontend/src/pages/Schools.tsx`
- `Frontend/src/types/index.ts`
- `Frontend/src/services/api.ts`

> Note: `Frontend/src/pages/shop/ShopAdminHub.tsx` shows a large diff in the working
> tree but is a pre-existing wholesale-reformatting change unrelated to this work
> (never touched as part of Grade Management standardization) — excluded above.

---

## 10. How to Apply / Verify

1. **Apply the migration**: simply start the backend (`dotnet run` on
   `NubeEra.API`). `Program.cs` calls `Database.Migrate()` at startup, which will
   create `grade_levels`, seed the 10 standardized rows, add `from_grade_id`/
   `to_grade_id` to `schools`, and wire the FKs/indexes — no manual SQL needed.
2. **Verify**: confirm `grade_levels` has exactly 10 active rows (LevelNumber 1–10),
   and that `schools.from_grade_id`/`to_grade_id` exist with FKs to `grade_levels`.
3. **Run tests** (once `dotnet` SDK is available):
   `dotnet test Backend/NubeEra.Tests --filter GradeManagement`
4. **Optional snapshot sync**:
   `dotnet ef migrations add SyncGradeLevelModelSnapshot --project Backend/NubeEra.Infrastructure --startup-project Backend/NubeEra.API`
   (expected to produce an empty Up/Down — confirms the hand-written migration
   matches the model).

---

## 11. Performance Notes

- Master grade list cached 6 hours (`IMemoryCache`, `GradeAccessService`)
- Per-school range cached 30 minutes (`SchoolGradeRangeService`), invalidated on edit
- Frontend `GradeLevelSelect` shares a module-level cache across every instance on
  a page — one network round trip regardless of how many selectors are rendered
- All grade-visibility resolution funnels through these two cached services, so no
  module performs its own ad-hoc DB query for "what grades are visible here"
