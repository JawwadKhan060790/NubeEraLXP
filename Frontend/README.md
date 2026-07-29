# NubeEra LMS — Frontend

React 19 · TypeScript · Vite 7 · Tailwind v4 · react-router-dom v7

Enterprise-grade Learning Management System frontend with module-based architecture, centralised service layer, role-based access control, and full TypeScript coverage.

---

## Stack

| Layer | Technology |
|---|---|
| UI framework | React 19 + TypeScript |
| Build tool | Vite 7 |
| Styling | Tailwind CSS v4 |
| Routing | react-router-dom v7 |
| HTTP client | Axios (with interceptors) |
| Toasts | Sonner |
| Icons | lucide-react |
| Rich text | @monaco-editor/react |

---

## Folder Structure

```
src/
├── app/                        # Framework-level wiring
│   ├── config/
│   │   ├── environment.ts      # ENV object (API base URL, feature flags)
│   │   └── appConfig.ts        # APP_CONFIG (timeouts, page sizes, keys)
│   ├── providers/
│   │   └── AppProviders.tsx    # ThemeProvider → AuthProvider → Toaster
│   └── routes/
│       ├── index.tsx           # ALL route definitions + lazy imports
│       └── RoleProtectedRoute.tsx
│
├── constants/                  # Compile-time string constants
│   ├── roles.ts                # ROLES, ROLE_GROUPS, RoleValue
│   ├── routes.ts               # ROUTES (60+ path constants)
│   ├── api.ts                  # API_ENDPOINTS
│   ├── permissions.ts          # PERMISSIONS + PERMISSION_MATRIX
│   └── index.ts                # Barrel re-export
│
├── types/                      # TypeScript domain types
│   ├── common.types.ts         # PaginatedResponse, ApiError, SelectOption …
│   ├── auth.types.ts           # User, LoginRequest, AuthResponse …
│   ├── school.types.ts         # School, Grade + payloads
│   ├── student.types.ts        # Student + payloads
│   ├── teacher.types.ts        # Teacher + payloads
│   ├── academic.types.ts       # Module, Lesson, Exam, Question, Scheduler …
│   └── index.ts                # Barrel re-export
│
├── services/                   # API service layer (one file per domain)
│   ├── apiClient.ts            # Axios instance + interceptors
│   ├── authService.ts
│   ├── schoolService.ts        # schoolService + gradeService
│   ├── studentService.ts
│   ├── teacherService.ts
│   ├── academicService.ts      # moduleService, lessonService, examService …
│   ├── attendanceService.ts
│   ├── userService.ts
│   ├── integrations/
│   │   ├── fileUploadIntegration.ts
│   │   └── notificationIntegration.ts
│   └── index.ts                # Barrel re-export
│
├── context/
│   └── AuthContext.tsx         # AuthProvider + useAuthContext + useIsRole
│
├── hooks/                      # Custom React hooks
│   ├── useAuth.ts              # Re-exports useAuthContext as useAuth
│   ├── usePermissions.ts       # can(), isRole(), isAdmin, isTeacher …
│   ├── usePagination.ts        # Client-side pagination
│   ├── useDebounce.ts
│   ├── useModal.ts
│   ├── useApi.ts               # Generic data-fetching hook
│   └── index.ts                # Barrel re-export
│
├── utils/                      # Pure utility functions (no React)
│   ├── formatters.ts           # formatDate, formatCurrency, truncate …
│   ├── storage.ts              # Typed localStorage / sessionStorage wrappers
│   ├── permissions.ts          # userCan(), userIsRole() — for use outside components
│   ├── urlHelper.ts            # resolveMediaUrl
│   ├── validation.ts           # sanitizeMobileInput, isValidEmail …
│   └── index.ts                # Barrel re-export
│
├── components/                 # Shared UI components
│   ├── common/                 # Pagination, StatsCard
│   ├── forms/                  # GradeLevelSelect, MobileNumberInput, PremiumRichTextEditor
│   ├── modals/                 # ConfirmModal
│   ├── export/                 # ExportButton
│   ├── reports/                # ReportChart, ReportFilter, ReportGrid, ReportPage
│   ├── support/                # NotificationBell, TicketStatusBadge
│   ├── AIChat/                 # ChatButton, ChatPanel, MessageBubble
│   └── index.ts                # Barrel re-export
│
├── modules/                    # Feature modules — one folder per domain
│   ├── dashboard/pages/        # Dashboard, StaffDashboard, TeacherDashboard …
│   ├── schools/pages/          # Schools, Grades
│   ├── teachers/pages/         # Teachers, PendingTeachers, CreateTeacher, TeacherFees
│   ├── students/pages/         # Students, StudentLearning
│   ├── users/pages/            # Users, CreateStaff, AdminSettings …
│   ├── academics/pages/        # Modules, Lessons, StaffModuleQuestions, TeacherScheduler
│   ├── exams/pages/            # Exams
│   ├── attendance/pages/       # TeacherAttendance
│   ├── eventsHub/pages/        # Events
│   ├── reports/pages/          # Reports, ReportView
│   ├── auth/pages/             # Login, UpdateProfile, ChangePassword, Unauthorized
│   ├── certificates/pages/     # CertificatesAdminHub, MyCertificates
│   ├── reportCards/pages/      # ReportCardsAdminHub, GenerateReportCard …
│   ├── equipmentHub/pages/     # ShopHome, ProductListing, CartPage, CheckoutPage …
│   ├── supportTickets/pages/   # TicketList, RaiseTicket, TicketDetails …
│   └── index.ts                # Top-level barrel re-export
│
├── layout/                     # Sidebar, Header (authenticated shell)
├── pages/                      # Legacy originals — kept for reference, not imported
├── contexts/                   # ThemeContext
│
├── App.tsx                     # Root component — providers + router shell only
└── main.tsx                    # Vite entry point
```

---

## Architecture Principles

### Single Source of Truth for Constants

Never hard-code strings at the call site. Every path, role, permission, and endpoint has a named constant.

```typescript
// Bad
navigate('/admin/dashboard');
if (user?.utype === 'admin') { ... }
axios.get('/api/students');

// Good
navigate(ROUTES.ADMIN_DASHBOARD);
if (can(PERMISSIONS.STUDENTS_VIEW)) { ... }
studentService.getStudents(params);
```

### Service Layer Pattern

All HTTP calls go through a typed service function. Pages never call `axios` or `api` directly.

```typescript
// src/services/studentService.ts
export const studentService = {
  getStudents: (params?: ListQueryParams) =>
    get<PaginatedResponse<Student>>(API_ENDPOINTS.STUDENTS.BASE, { params }),
  createStudent: (payload: StudentCreatePayload) =>
    post<Student>(API_ENDPOINTS.STUDENTS.BASE, payload),
};

// In a page component
const { data, isLoading } = useApi(() => studentService.getStudents(query), [query]);
```

### Role-Based Access Control

Permissions are declared in `constants/permissions.ts` as `module:action` strings. The `PERMISSION_MATRIX` maps each permission to an array of allowed roles.

```typescript
// In a component
const { can, isAdmin } = usePermissions();
if (can(PERMISSIONS.STUDENTS_CREATE)) { ... }

// Outside React
import { userCan } from '@/utils/permissions';
if (userCan('students:create', user?.utype)) { ... }
```

### Route Configuration

All routes are defined in one place: `src/app/routes/index.tsx`. Every page is lazy-loaded. Adding a route means: (1) add the component in the module, (2) add the lazy import, (3) add the `<Route>` — nothing else changes.

```typescript
const MyNewPage = React.lazy(() => import('../../modules/myModule/pages/MyNewPage'));
// Inside AuthenticatedRoutes:
<Route path={ROUTES.MY_NEW_PAGE} element={protect([ROLES.ADMIN], <MyNewPage />)} />
```

### Auth Context

`AuthContext` is the single source of truth for auth state. It bootstraps from localStorage on mount, exposes `login()` / `logout()`, and keeps `user`, `isAuthenticated`, and `isLoading` in sync.

```typescript
const { user, isAuthenticated, login, logout } = useAuthContext();
// or via the alias:
const { user } = useAuth();
```

---

## Coding Standards

### Imports

- Use `@/` absolute imports everywhere — no `../../../` chains.
- Import from barrel files when importing more than one symbol.
- Lazy-import all page-level components.

```typescript
import { formatDate, formatCurrency } from '@/utils';
import { ConfirmModal } from '@/components/modals';
import { studentService } from '@/services';
import { ROUTES, ROLES, PERMISSIONS } from '@/constants';
```

### Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Components | PascalCase | `StudentList.tsx` |
| Hooks | camelCase + `use` prefix | `useStudents.ts` |
| Services | camelCase + `Service` suffix | `studentService` |
| Constants | SCREAMING_SNAKE_CASE | `ROUTES.ADMIN_DASHBOARD` |
| Types / Interfaces | PascalCase | `StudentCreatePayload` |
| Utilities | camelCase | `formatDate`, `storageGet` |

### Component Rules

- One component per file.
- No `console.log` in committed code.
- No inline `style={}` for layout — use Tailwind classes.
- Avoid `any`. Prefer `unknown` then narrow, or declare a proper type.
- Props interfaces go at the top of the file, above the component.

### Service Rules

- Service functions return the unwrapped data type (the Axios interceptor strips the envelope).
- Mutating functions (`POST`/`PUT`/`PATCH`/`DELETE`) are `async` and throw on error — callers handle with `try/catch` or toast.
- Never store raw tokens in service code — that belongs in `authService.persistSession`.

---

## Adding a New Feature

1. **Type** — add payload / response types in `src/types/<domain>.types.ts`
2. **Constant** — add the route in `src/constants/routes.ts`, the endpoint in `src/constants/api.ts`, any new permission in `src/constants/permissions.ts`
3. **Service** — add CRUD functions in `src/services/<domain>Service.ts`
4. **Page** — create `src/modules/<domain>/pages/MyPage.tsx`
5. **Barrel** — export from `src/modules/<domain>/index.ts`
6. **Route** — add lazy import + `<Route>` in `src/app/routes/index.tsx`

---

## Development

```bash
npm install          # Install dependencies
npm run dev          # Dev server with hot reload
npx tsc --noEmit     # Type check without emitting
npm run build        # Production build
```

Environment variables go in `.env.local` (not committed):

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Role Reference

| Role | Value | Access |
|---|---|---|
| Super Admin | `superadmin` | Full system access |
| Admin | `admin` | School-level full access |
| Principal | `principal` | School management, read-only financials |
| Staff | `staff` | Academics, students, teachers management |
| Teacher | `teacher` | Own classes, students, exams |
| Student | `student` | Own learning content, exams, certificates |
| Parent | `parent` | Child progress, report cards |
