# NubeEra LMS - Backend Documentation (.NET Web API)

The **NubeEra LMS Backend** is a robust, enterprise-grade Web API built on **.NET 8** following **Clean Architecture** principles. It serves as the single source of truth for the entire Learning Management System ecosystem.

## 🏗️ Architecture
The project is divided into four main layers:
1. **NubeEra.API**: Entry point, Controllers, and Middleware.
2. **NubeEra.Application**: Business logic, Services, and DTOs.
3. **NubeEra.Domain**: Entities, Common Interfaces, and Constants.
4. **NubeEra.Infrastructure**: Data Persistence (EF Core), JWT Security, and External Integrations.

---

## 🔒 Security & RBAC (Role-Based Access Control)

The backend enforces strict security policies to protect institutional data.

### Authorization Policies:
We use a hierarchical policy system defined in `Program.cs`:
- `AdminOnly`: `SuperAdmin`, `Admin`
- `StaffOnly`: `SuperAdmin`, `Admin`, `Staff`
- `PrincipalOnly`: `SuperAdmin`, `Admin`, `Staff`, `Principal`
- `TeacherOnly`: `SuperAdmin`, `Admin`, `Staff`, `Principal`, `Teacher`
- `StudentOnly`: Every authenticated user.

---

## 🏢 Multi-Tenancy Architecture

The system is designed for multi-school operations using a **Shared Database, Isolated Data** approach:
- **`IMultiTenant` Interface**: Entities like `Student`, `Teacher`, and `Module` implement this to track `SchoolId`.
- **Global Query Filters**: Automatically applied in `AppDbContext` to ensure that a Principal or Teacher only ever sees data belonging to their specific school.
- **Context Injection**: The `CurrentUserService` extracts the `SchoolId` from the JWT token and injects it into services for automatic scoping.

---

## 📊 Business Logic: Role-Wise Dashboard Sections

The `DashboardService` calculates real-time metrics for various dashboard sections:
- **Schools Overview**: Aggregated stats for SuperAdmins across all institutions.
- **Enrollment Monitoring**: Real-time counts of students and teachers per school.
- **Pending Approvals**: Tracking registration requests for new principals and teachers.
- **Academic Statistics**: Counts for Modules, Lessons, and Exam results.

---

## 📡 API Response Synchronization

The API is specifically tuned to support the React frontend requirements:
- **Snake Case Mapping**: Responses use `snake_case` (e.g., `first_name`, `school_id`) for user profile data.
- **`utype` Compatibility**: Maps .NET Enums/Roles to frontend strings (`admin`, `principal`, `teacher`).
- **Full Name Serialization**: Explicitly provides `full_name` fields to allow immediate UI rendering without frontend-side calculation.

---

## 🚀 Environment & Database
- **Core**: .NET 8.0
- **Database**: SQL Server (via Entity Framework Core)
- **Migrations**: Automatic database migration and seeding via `AdminSeeder`.
- **Security**: BCrypt for password hashing and JWT for session management.

## 🏃 Getting Started
1. Update `appsettings.json` with your connection string.
2. Run migrations: `dotnet ef database update`
3. Launch API: `dotnet run --project NubeEra.API`
4. Access Swagger: `http://localhost:5000/swagger`
