using BCrypt.Net;
using NubeEra.Seeder.Core;
using static NubeEra.Seeder.Core.BulkHelper;

namespace NubeEra.Seeder.Seeders;

/// <summary>
/// Seeds:
///   10 Principal users  (one per school)
///   10 Teacher users + Teacher profiles
///   10 Student users + Student profiles
///   10 Parent users  (linked to students)
///
/// All passwords = "123456"  (BCrypt workFactor=4 for seeding speed)
/// </summary>
public static class UserSeeder
{
    private const int TEACHER_COUNT = 10;
    private const int STUDENT_COUNT = 10;

    public static async Task RunAsync(string connStr, SeedContext ctx)
    {
        // Pre-hash once and reuse for all users (valid BCrypt – Verify("123456", hash) = true)
        ctx.PasswordHash123456 = BCrypt.Net.BCrypt.HashPassword("123456", workFactor: 4);
        var ph = ctx.PasswordHash123456;
        var now = DateTime.UtcNow;

        await using var bulk = new BulkHelper(connStr, 1_000);
        await bulk.OpenAsync();

        await SeedPrincipalsAsync(bulk, ctx, ph, now);
        await SeedTeachersAsync(bulk, ctx, ph, now);
        await SeedStudentsAsync(bulk, ctx, ph, now);
        await SeedParentsAsync(bulk, ctx, ph, now);
    }

    // ── Principals (10) ──────────────────────────────────────────────────
    private static async Task SeedPrincipalsAsync(BulkHelper bulk, SeedContext ctx, string ph, DateTime now)
    {
        var roleId = ctx.RoleId("Principal");
        var userRows = new List<string>(10);

        foreach (var (schoolNum, schoolId) in ctx.Schools)
        {
            var userId = NewGuid();
            ctx.PrincipalUserIds[schoolNum] = userId;
            var username = $"principal{schoolNum}";
            var email    = $"{username}@sch{schoolNum:D3}.edu";
            userRows.Add(
                $"({G(userId)},{G(schoolId)},{G(roleId)},{Q(email)},{Q(ph)}," +
                $"{Q("Principal")},{Q($"SCH{schoolNum:D3}")},NULL,1,NULL,NULL,{D(now)})");
        }

        await bulk.BulkInsertAsync("users",
            "Id,SchoolId,RoleId,Email,PasswordHash,FirstName,LastName,Phone,IsActive,ProfileImageUrl,LastLoginAt,CreatedAt",
            userRows, label: "Principal users");

        // Update school.PrincipalName
        foreach (var (schoolNum, userId) in ctx.PrincipalUserIds)
        {
            // Batch UPDATE via CASE ... done below
        }
        // Bulk update principal names on schools
        var updates = ctx.Schools.Select(kv =>
            $"UPDATE schools SET PrincipalName='Principal SCH{kv.Key:D3}', " +
            $"PrincipalEmail='principal{kv.Key}@sch{kv.Key:D3}.edu' " +
            $"WHERE Id={G(kv.Value)};");

        // Execute in groups of 100 for speed
        foreach (var chunk in updates.Chunk(100))
        {
            await bulk.ExecAsync(string.Join('\n', chunk));
        }
    }

    // ── Teachers (10) ────────────────────────────────────────────────────
    private static async Task SeedTeachersAsync(BulkHelper bulk, SeedContext ctx, string ph, DateTime now)
    {
        var roleId       = ctx.RoleId("Teacher");
        var userRows     = new List<string>(TEACHER_COUNT);
        var teacherRows  = new List<string>(TEACHER_COUNT);
        var quals        = new[] { "B.Ed", "M.Ed", "B.Sc + PGCE", "M.Sc + B.Ed", "Ph.D" };
        var specs        = new[] { "Mathematics", "Science", "Robotics", "Coding", "AI & ML",
                                    "English", "Physics", "Chemistry", "STEM", "Computer Science" };

        for (int n = 1; n <= TEACHER_COUNT; n++)
        {
            var schoolNum = ((n - 1) % 10) + 1;   // distribute across 10 schools
            var schoolId  = ctx.SchoolId(schoolNum);
            var userId    = NewGuid();
            var teacherId = NewGuid();
            ctx.TeacherIds[n] = (userId, teacherId, schoolId);

            var email  = $"t{n}@sch{schoolNum:D3}.edu";
            var empId  = $"SCH{schoolNum:D3}-TCH-{n:D4}";
            var dob    = new DateTime(1975 + (n % 25), (n % 12) + 1, (n % 28) + 1);

            userRows.Add(
                $"({G(userId)},{G(schoolId)},{G(roleId)},{Q(email)},{Q(ph)}," +
                $"{Q($"Teacher")},{Q($"T{n}")},NULL,1,NULL,NULL,{D(now)})");

            teacherRows.Add(
                $"({G(teacherId)},{G(schoolId)},{G(userId)},{Q(empId)}," +
                $"{Q("Teacher")},{Q($"T{n}")},{Q(email)},NULL,NULL,{D(dob)},NULL," +
                $"'{dob:yyyy-MM-dd HH:mm:ss}'," +
                $"{Q(quals[(n-1) % quals.Length])},{Q(specs[(n-1) % specs.Length])}," +
                $"NULL,NULL,1,{D(now)})");
        }

        await bulk.BulkInsertAsync("users",
            "Id,SchoolId,RoleId,Email,PasswordHash,FirstName,LastName,Phone,IsActive,ProfileImageUrl,LastLoginAt,CreatedAt",
            userRows, label: "Teacher users");

        await bulk.BulkInsertAsync("teachers",
            "Id,SchoolId,UserId,EmployeeId,FirstName,LastName,Email,Phone,Address,DateOfBirth,Gender,JoiningDate,Qualification,Specialization,Salary,ProfilePictureUrl,IsActive,CreatedAt",
            teacherRows, label: "Teacher profiles");
    }

    // ── Students (10) ────────────────────────────────────────────────────
    private static async Task SeedStudentsAsync(BulkHelper bulk, SeedContext ctx, string ph, DateTime now)
    {
        var roleId      = ctx.RoleId("Student");
        var userRows    = new List<string>(STUDENT_COUNT);
        var studentRows = new List<string>(STUDENT_COUNT);

        for (int n = 1; n <= STUDENT_COUNT; n++)
        {
            var schoolNum  = ((n - 1) % 10) + 1;
            var gradeLevel = ((n - 1) % 10) + 1;
            var schoolId   = ctx.SchoolId(schoolNum);
            var gradeId    = ctx.GradeId(schoolNum, gradeLevel);
            var userId     = NewGuid();
            var studentId  = NewGuid();
            var email      = $"s{n}@student.sch{schoolNum:D3}.edu";
            var parentEmail = $"p{n}@parent.sch{schoolNum:D3}.edu";
            var dob        = new DateTime(2005 + (n % 8), (n % 12) + 1, (n % 28) + 1);
            var genders    = new[] { "Male", "Female" };

            ctx.StudentIds[n] = (userId, studentId, schoolId, gradeId, email);

            userRows.Add(
                $"({G(userId)},{G(schoolId)},{G(roleId)},{Q(email)},{Q(ph)}," +
                $"{Q("Student")},{Q($"S{n}")},NULL,1,NULL,NULL,{D(now)})");

            studentRows.Add(
                $"({G(studentId)},{G(schoolId)},{G(gradeId)},{G(userId)}," +
                $"{Q($"SCH{schoolNum:D3}-STU-{n:D4}")}," +
                $"{Q($"ROLL-{n:D5}")}," +
                $"{Q("Student")},{Q($"S{n}")}," +
                $"{Q(email)}," +
                $"{Q($"+971-{50+n%50:D2}-{n:D7}")}," +
                $"'{dob:yyyy-MM-dd HH:mm:ss}'," +
                $"{Q(genders[n % 2])},NULL," +
                $"{Q($"Villa {n}, Street {n % 50 + 1}, District {n % 20 + 1}")}," +
                $"'{now:yyyy-MM-dd HH:mm:ss}'," +
                $"{Q($"Parent of S{n}")},{Q($"+971-{60+n%40:D2}-{n:D7}")}," +
                $"{Q(parentEmail)}," +
                $"NULL,NULL,NULL,1,{D(now)})");
        }

        await bulk.BulkInsertAsync("users",
            "Id,SchoolId,RoleId,Email,PasswordHash,FirstName,LastName,Phone,IsActive,ProfileImageUrl,LastLoginAt,CreatedAt",
            userRows, label: "Student users");

        await bulk.BulkInsertAsync("students",
            "Id,SchoolId,GradeId,UserId,StudentId,RollNo,FirstName,LastName,Email," +
            "Phone,DateOfBirth,Gender,BloodGroup,Address,AdmissionDate," +
            "ParentGuardianName,ParentGuardianPhone,ParentGuardianEmail," +
            "EmergencyContact,ProfilePictureUrl,PersonalNote,IsActive,CreatedAt",
            studentRows, label: "Student profiles");
    }

    // ── Parents (5,000) ───────────────────────────────────────────────────
    private static async Task SeedParentsAsync(BulkHelper bulk, SeedContext ctx, string ph, DateTime now)
    {
        var roleId      = ctx.RoleId("Parent");
        var userRows    = new List<string>(STUDENT_COUNT);

        for (int n = 1; n <= STUDENT_COUNT; n++)
        {
            var (_, _, schoolId, _, studentEmail) = ctx.StudentIds[n];
            var schoolNum = ((n - 1) % 10) + 1;
            var userId    = NewGuid();
            ctx.ParentUserIds[n] = userId;
            var email = $"p{n}@parent.sch{schoolNum:D3}.edu";

            userRows.Add(
                $"({G(userId)},{G(schoolId)},{G(roleId)},{Q(email)},{Q(ph)}," +
                $"{Q("Parent")},{Q($"P{n}")},{Q($"+971-{60+n%40:D2}-{n:D7}")},1,NULL,NULL,{D(now)})");
        }

        await bulk.BulkInsertAsync("users",
            "Id,SchoolId,RoleId,Email,PasswordHash,FirstName,LastName,Phone,IsActive,ProfileImageUrl,LastLoginAt,CreatedAt",
            userRows, label: "Parent users");
    }
}
