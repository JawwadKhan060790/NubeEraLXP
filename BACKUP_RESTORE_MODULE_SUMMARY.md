# Database Backup & Restore Module — Implementation Summary

**Module:** Settings → Backup & Restore
**Mechanism:** Manual "Dump File Mechanism" (mysqldump / mysql CLI orchestration)
**Access:** Super Admin / System Admin only (reuses the existing `AdminOnly` policy)
**Architecture:** Clean Architecture — Domain → Application → Infrastructure → API, CQRS-style service + generic repository pattern, matching the rest of the NubeEra LMS codebase

---

## 1. What was built

- A **Backup** tab that triggers a full database dump (schema, data, stored procedures, functions, views, triggers, indexes, foreign keys) via `mysqldump --routines --triggers --events --single-transaction`, auto-named `DatabaseName_yyyyMMdd_HHmmss.sql`, recorded in history with status/size/duration.
- A **Restore** tab with drag-and-drop `.sql` upload, client- and server-side validation (extension, size ≤ 500 MB, content sniffing for valid SQL-dump markers), and a **mandatory confirmation dialog** ("Restoring this backup will overwrite existing data. Do you want to continue? This action cannot be undone.") before any destructive action — enforced both in the UI and again server-side via `RestoreConfirmationDto.ConfirmRestore`.
- A **Backup History** grid (Backup Name, Date, File Size, Created By, Status, Download, Delete) with search, status filter, and pagination.
- A **status banner / polling** mechanism (`GET /api/backups/status`, polled every 5s) that disables Create/Restore buttons while an operation is running, backed by a process-wide concurrency gate so backup and restore can never run concurrently.
- **Full audit logging**: every action (BackupStarted, BackupCreated, BackupDownloaded, BackupDeleted, RestoreStarted, RestoreCompleted, AccessDenied) is recorded with User ID, User Name, Role, DateTime, IP address, action type, status, and details.
- **Navigation**: new "Backup & Restore" item under Settings in the sidebar, routed and role-protected (`admin`/`superadmin`).

---

## 2. Files created

### Backend — Domain
- `NubeEra.Domain/Common/BackupConstants.cs` — shared status/action-type string constants, `MaxRestoreFileSizeBytes`, `AllowedRestoreExtension`
- `NubeEra.Domain/Entities/BackupHistory.cs` — backup run record (FileName, FilePath, DatabaseName, FileSizeBytes, Status, ErrorMessage, DurationMs, CreatedByUserId/Name, IsFileDeleted)
- `NubeEra.Domain/Entities/BackupAuditLog.cs` — audit trail entity (UserId, UserName, Role, ActionType, DateTime, IpAddress, Status, Details)

### Backend — Application
- `NubeEra.Application/DTOs/BackupDtos.cs` — `BackupHistoryDto`, `CreateBackupResultDto`, `RestoreBackupResultDto`, `RestoreConfirmationDto`, `BackupModuleStatusDto`, `BackupAuditLogDto`, `PagedResultDto<T>`, `BackupHistoryQueryDto`
- `NubeEra.Application/Interfaces/Services/Backup/IBackupService.cs` — service contract (`CreateBackupAsync`, `GetHistoryAsync`, `OpenBackupFileForDownloadAsync`, `DeleteBackupAsync`, `RestoreBackupAsync`, `GetModuleStatus`)
- `NubeEra.Application/Validators/BackupRequestValidators.cs` — `RestoreConfirmationDtoValidator` (must confirm), `BackupHistoryQueryDtoValidator` (page/page-size bounds, allowed status values, search-term length)

### Backend — Infrastructure
- `NubeEra.Infrastructure/Services/Backup/BackupService.cs` — full service implementation: `mysqldump`/`mysql` process orchestration via `System.Diagnostics.Process`, connection-string parsing via `MySqlConnectionStringBuilder`, process-wide concurrency gate (`ModuleState`), file I/O, history persistence, audit logging, file-size formatting, SQL-content validation, timeout/cancellation handling, friendly error mapping

### Backend — API
- `NubeEra.API/Controllers/Backup/BackupController.cs` — `[Authorize(Policy = "AdminOnly")]` controller exposing:
  - `GET    /api/backups/status`
  - `POST   /api/backups`
  - `GET    /api/backups` (paged/searchable/filterable history)
  - `GET    /api/backups/{id}/download`
  - `DELETE /api/backups/{id}`
  - `POST   /api/backups/restore` (multipart upload + `ConfirmRestore`)

### Backend — Database
- EF Core entity configurations for `BackupHistory` / `BackupAuditLog` registered on `AppDbContext` (`DbSet<BackupHistory> BackupHistories`, `DbSet<BackupAuditLog> BackupAuditLogs`) — migration-ready schema additions

### Backend — Tests (new test project)
- `NubeEra.Tests/NubeEra.Tests.csproj` — xUnit + Moq + FluentAssertions + EF Core InMemory, registered in `NubeEra-ms.slnx`
- `NubeEra.Tests/BackupModule/BackupRequestValidatorsTests.cs` — 8 tests covering both validators (confirmation gate, page/page-size bounds, allowed status values, search length)
- `NubeEra.Tests/BackupModule/BackupServiceTests.cs` — constructor/connection-string validation, module status, `FormatFileSize`, history search/filter/pagination/`CanDownload` (against a real EF Core InMemory `AppDbContext` + `GenericRepository<T>`), download (found/missing/audit), delete (not-found/success/audit), and restore pre-flight validation paths (missing confirmation, wrong extension, empty file, oversized file) — all of which run before any external process is spawned
- `NubeEra.Tests/BackupModule/BackupControllerTests.cs` — status/history/download/delete/restore endpoint wiring, validator short-circuiting → `AppException` (mapped to HTTP 400), download-not-found → 404, success/failure payload shapes for backup creation and restore

### Frontend
- `Frontend/src/pages/DatabaseBackupRestore.tsx` — full page: Backup / Restore / History tabs, status polling, drag-and-drop upload with client-side validation, two `ConfirmModal` dialogs (restore overwrite warning, delete confirmation), blob-based file download, search/filter/pagination, toasts, loaders, badges

---

## 3. Files modified

| File | Change |
|---|---|
| `NubeEra.Infrastructure/DependencyInjection.cs` | Registered `IHttpContextAccessor` and `IBackupService → BackupService` (Scoped) |
| `NubeEra.API/appsettings.json` | Added `Backup` config section (`OutputDirectory`, `MySqlDumpPath`, `MySqlRestorePath`, `CommandTimeoutSeconds`) |
| `Frontend/src/layout/Sidebar.tsx` | Added `DatabaseBackup` icon import and "Backup & Restore" nav item under Settings (`/admin/backup-restore`) |
| `Frontend/src/App.tsx` | Imported `DatabaseBackupRestore` page and added role-protected route `/admin/backup-restore` (`admin`/`superadmin`) |
| `NubeEra-ms.slnx` | Registered the new `NubeEra.Tests` project |

---

## 4. Security & safety mechanisms

- Controller-level `[Authorize(Policy = "AdminOnly")]` — Super Admin / Admin only, consistent with every other admin surface
- Server-side re-validation of the overwrite confirmation (`RestoreConfirmationDtoValidator`) — a direct API call without `ConfirmRestore = true` is rejected with `AppException` → HTTP 400, never reaching the restore logic
- `.sql`-only extension check, max upload size (500 MB) enforced via `[RequestSizeLimit]`/`[RequestFormLimits]` and in `BackupService`
- Heuristic SQL-dump content sniffing before invoking `mysql`, to avoid running arbitrary/corrupted files against the database
- Process-wide concurrency gate (`ModuleState`) — prevents simultaneous backup and restore operations even across concurrent requests (the service is Scoped, the gate is static and lock-guarded)
- Full audit trail (User ID, User Name, Role, DateTime, IP address, action type, status, details) for every backup/restore lifecycle event, written via a fire-and-forget helper that never throws (so audit failures can't break the primary operation)
- Friendly error mapping for missing CLI tools / process failures / timeouts, all surfaced through the existing `AppException` → `ExceptionHandlingMiddleware` → `ApiResponse<T>` pipeline

---

## 5. Configuration required before first use

In `appsettings.json` (or environment-specific overrides), the `Backup` section controls:

```json
"Backup": {
  "OutputDirectory": "App_Data/backups",
  "MySqlDumpPath": "mysqldump",
  "MySqlRestorePath": "mysql",
  "CommandTimeoutSeconds": 1800
}
```

`MySqlDumpPath`/`MySqlRestorePath` should point to the `mysqldump`/`mysql` executables (full path if they're not on the system `PATH`). `OutputDirectory` is relative to the API's content root and is created automatically if missing.

---

## 6. Verification notes

No .NET SDK is available in this environment, so `dotnet build`/`dotnet test`/`dotnet ef` could not be executed directly. Verification was performed via:

- Direct `Read` cross-checks of every type, namespace, property, and constant referenced by the new code against its actual declaration (`IGenericRepository<T>`, `ICurrentUserService`, `AppDbContext`, `BackupHistory`/`BackupAuditLog` entities, `BackupConstants`, all DTOs, `IBackupService`, `AppException`, `MySqlConnectionStringBuilder` usage)
- Grep-based confirmation of the JSON serialization convention (snake_case) used by every other page, applied consistently to the new TypeScript interfaces
- Manual review of the exact `AppException` message strings thrown by `BackupService` against the `WithMessage` assertions in the new test suite
- Review of existing patterns (file download via blob in `Events.tsx`, `AdminOnly` policy usage, `ConfirmModal` component, sidebar/route wiring conventions) to ensure the new module matches house style exactly

The new test project (`NubeEra.Tests`) is ready to run with `dotnet test` once the SDK is available — it provides full coverage of the validators, the service's business logic (using a real EF Core InMemory-backed repository, not hand-rolled fakes), and the controller's HTTP-adapter behavior, while deliberately not exercising the live `mysqldump`/`mysql` process invocation (an environment dependency outside unit-test scope).
