# Generic Excel Export Framework — Implementation & Rollout Guide

## What was built (Phase 1 — complete)

A single, reusable Excel export pipeline now exists end-to-end and is piloted on
two modules (Students, Teachers). It follows the existing architecture exactly —
no new patterns were introduced.

### Backend (`NubeEra.Application` / `NubeEra.Infrastructure` / `NubeEra.API`)

| Piece | Location | Role |
|---|---|---|
| `ExportColumnDefinition`, `ExportConfiguration` | `NubeEra.Application/Common/Export/` | Pure metadata describing a module's export shape (column key, header, type, format, width). One static list per module. |
| `IExcelExportService` | `NubeEra.Application/Interfaces/Services/Export/` | Contract: `byte[] GenerateExcel(rows, configuration)`. Documented as a *pure formatter* — no data access, no auth, no filtering. |
| `ExcelExportService` (ClosedXML) | `NubeEra.Infrastructure/Services/Export/` | The ONE workbook generator for the whole app. Brand-styled headers (#2563EB), auto-filter, frozen header row, typed cell formatting (Text/Number/Currency/Date/DateTime/Boolean), auto-sized columns. Registered in `AddInfrastructure` exactly like `IUploadService`/`IEmailService`. |
| `[HttpGet("export")]` actions | `StudentsController`, `TeachersController` | Each module: (1) calls the *same* `_service.GetAllAsync()` the list endpoint already calls, under the *same* `[Authorize(Policy = "...")]`, (2) projects the DTO into `Dictionary<string, object?>` rows keyed to its column metadata, (3) calls the shared `_excelExportService.GenerateExcel(...)`, (4) returns the `.xlsx` via `File(...)`. |

**Why this satisfies "no user can export beyond their permissions":** the export
action is not a new data path — it is the existing authorized list query, reused
verbatim, then formatted. A user can only ever export rows they could already see
on screen. No new authorization logic was written (and therefore none can be buggy).

### Frontend (`Frontend/src`)

| Piece | Location | Role |
|---|---|---|
| `downloadExport()` | `services/exportService.ts` | Generic blob-download helper: calls the export endpoint via the existing `api` axios client (`responseType: 'blob'`), reads the filename from `Content-Disposition`, triggers the browser save. |
| `useExport()` | `hooks/useExport.ts` | Wraps `downloadExport` with `isExporting` state + `sonner` toast feedback (mirrors `useConfirm()` conventions). Also unwraps JSON error messages that arrive as a Blob on failure. |
| `ExportButton` | `components/export/ExportButton.tsx` | The one export control for the whole app. Props: `endpoint`, `fallbackFileName`, `label`. Styled to match existing toolbar buttons (`rounded-[4px]`, uppercase tracking-widest 10px, lucide icon + text, shadow-sm). |

### Wired into

- `Students.tsx` — "Export to Excel" button in the roster header toolbar → `GET /students/export`
- `Teachers.tsx` — "Export to Excel" button in the management header toolbar → `GET /teachers/export`

### Verification

- Frontend: `npx tsc --noEmit -p tsconfig.json` → **0 errors** (clean compile, including the three new files and both edited pages).
- Backend: the sandbox has no `dotnet` CLI, so the C# changes could not be compiled here. **Please run `dotnet build` locally** before merging — the changes are additive (new files + DI registration + a new controller action + a new constructor parameter wired through DI), so risk is low, but a local build is the only way to confirm.

---

## Rollout plan — applying this to the remaining modules

Per-module integration is now a **3-step, copy-paste-and-adjust** task (no new
engine code, ever):

1. **Backend** — in the module's controller:
   - Add `using NubeEra.Application.Common.Export;` and `using NubeEra.Application.Interfaces.Services.Export;`
   - Add `private readonly IExcelExportService _excelExportService;` + constructor param (DI already provides it — registered once in `AddInfrastructure`)
   - Declare a `private static readonly IReadOnlyList<ExportColumnDefinition> {Module}ExportColumns` list (the only "new" code per module)
   - Add `[HttpGet("export")] [Authorize(Policy = "<same policy as GetAll>")] Export()` that reuses the existing `GetAllAsync()`/query, projects to `Dictionary<string, object?>`, and calls `_excelExportService.GenerateExcel(...)`
2. **Frontend** — in the module's list page:
   - `import ExportButton from '../components/export/ExportButton';`
   - Drop `<ExportButton endpoint="/{resource}/export" fallbackFileName="{resource}-export.xlsx" label="Export to Excel" />` into the toolbar
3. **Verify** — `npx tsc --noEmit` (frontend) + `dotnet build` (backend)

### Suggested order for the remaining ~27 modules

Group by domain so each batch reuses the same DTO-shape thinking:

- **People**: Parents, Staff, Principals (mirror Students/Teachers exactly)
- **Academics**: Courses, Modules/Lessons, Grades, Schools
- **Assessments**: Exams, Questions, Results
- **Operations**: Scheduler/Timetable, Attendance, Events
- **Commerce/Support** (if list-heavy): orders, tickets, etc.

For very large tables (the directive calls out **100,000+ rows**), two
additions are recommended *before* exposing export broadly on those modules —
both slot into the existing pipeline without changing its shape:

- **Streaming**: swap `byte[] GenerateExcel(...)` for a streaming overload (ClosedXML supports `SaveAs(Stream)`) so the API doesn't buffer the whole workbook in memory; return `FileStreamResult`.
- **Background processing**: for genuinely huge exports, queue the job (e.g. `IBackgroundTaskQueue`/hosted service already used elsewhere if present) and notify via the existing `IEmailService`/notification system when the file is ready, rather than holding the HTTP request open.

Neither requires touching `ExcelExportService`'s public contract — both are
additive extensions to the same framework.

---

## Phase 2 — explicitly deferred (per the user's directive, scoped separately)

The directive also called for **Generic Reporting**, **Dashboard**, and
**Chart/Analytics** frameworks (`IReportService`, `DashboardCard`/`KPICard`/
`ChartContainer`, `ChartService`/`LineChartComponent` family, etc.). These are
materially larger efforts — they involve new query/aggregation patterns, new
shared UI primitives, and a "standardized chart response model" that doesn't
yet exist anywhere in the codebase (current charts in `Dashboard.tsx` are
bespoke `recharts` usage, not yet abstracted).

Recommended sequencing for Phase 2:

1. **Reporting framework** next — it can reuse the Export framework's
   `ExportConfiguration`/`IExcelExportService` as its export leg (`ReportExportService`
   becomes a thin adapter), so building it second maximizes reuse of what's
   already in place.
2. **Chart framework** — define the "standardized chart response model" first
   (a `ChartResponseDto` shape), then build `ChartService`/`ChartDataBuilder`
   around it, then the `LineChartComponent`/`BarChartComponent`/etc. wrappers
   around the existing `recharts` usage already in `Dashboard.tsx`.
3. **Dashboard framework** last — it composes the other three (`KPICard` over
   report aggregates, `ChartContainer` over the chart framework, `DashboardExport`
   over the export framework), so it benefits from all of them existing first.

This sequencing avoids building any of the three in isolation only to discover
they need to be reshaped once the others land — directly serving the directive's
"avoid duplicate implementations" requirement.
