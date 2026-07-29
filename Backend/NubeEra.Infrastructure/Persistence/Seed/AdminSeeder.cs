using NubeEra.Domain.Common;
using NubeEra.Domain.Entities;
using NubeEra.Infrastructure.Persistence.DbContext;
using NubeEra.Infrastructure.Persistence.Configurations;
using Microsoft.Extensions.Configuration;

namespace NubeEra.Infrastructure.Persistence.Seed;

public static class AdminSeeder
{
    public static void Seed(AppDbContext context, IConfiguration configuration)
    {
        // 1a. Seed standard roles
        var standardRoles = new[] { "SuperAdmin", "Admin", "Principal", "Staff", "Teacher", "Student", "Parent" };
        foreach (var roleName in standardRoles)
        {
            if (!context.Roles.Any(r => r.RoleName == roleName))
            {
                context.Roles.Add(new Role { Id = Guid.NewGuid(), RoleName = roleName, IsActive = true, CreatedAt = DateTime.UtcNow });
            }
        }
        context.SaveChanges();

        // 1b. Seed or Retrieve Default School
        var defaultSchoolId = Guid.Parse("9de4bdad-a497-4dbd-8874-98e6b191716a");
        var defaultSchool = context.Schools.Find(defaultSchoolId)
            ?? context.Schools.FirstOrDefault(s => s.SchoolCode == "VER-001");
        if (defaultSchool == null)
        {
            defaultSchool = new School
            {
                Id = defaultSchoolId,
                SchoolCode = configuration["Seed:SchoolCode"] ?? "VER-001",
                Name = configuration["Seed:SchoolName"] ?? "NubeEra International School",
                IsActive = true
            };
            context.Schools.Add(defaultSchool);
            context.SaveChanges();
            Console.WriteLine($"✅ Default School created: {defaultSchool.Name}");
        }
        else if (defaultSchool.Id != defaultSchoolId)
        {
            // If school exists but with a different ID (e.g. from dynamic seed), align it if safe/referenced
            Console.WriteLine($"ℹ️ Default School found with ID: {defaultSchool.Id}");
        }

        // --- Global Grade Standardization ---
        // Ensure every school has a valid FromGrade/ToGrade range configured against the
        // system-defined GradeLevel master (Boot Camp to Grade X). Default schools support the full range.
        var gradeLevelIds = GradeLevelConfiguration.GradeLevelSeedIds;
        var firstGradeLevelId = gradeLevelIds[11];   // Level -1 (Boot Camp)
        var lastGradeLevelId = gradeLevelIds[9];     // Level 10 (Grade X)

        if (defaultSchool.FromGradeId == null || defaultSchool.ToGradeId == null)
        {
            defaultSchool.FromGradeId = firstGradeLevelId;
            defaultSchool.ToGradeId = lastGradeLevelId;
            context.Schools.Update(defaultSchool);
            context.SaveChanges();
            Console.WriteLine($"✅ Default School grade range configured: Boot Camp to Grade X");
        }

        // Seed default B2C School "NubeEra School"
        var b2cSchool = context.Schools.FirstOrDefault(s => s.SchoolCode == "NUBEERA-SCHOOL");
        if (b2cSchool == null)
        {
            b2cSchool = new School
            {
                Id = Guid.NewGuid(),
                SchoolCode = "NUBEERA-SCHOOL",
                Name = "NubeEra School",
                IsActive = true,
                FromGradeId = firstGradeLevelId,
                ToGradeId = lastGradeLevelId
            };
            context.Schools.Add(b2cSchool);
            context.SaveChanges();
            Console.WriteLine($"✅ Default B2C School created: {b2cSchool.Name}");
        }
        else if (b2cSchool.FromGradeId == null || b2cSchool.ToGradeId == null)
        {
            b2cSchool.FromGradeId = firstGradeLevelId;
            b2cSchool.ToGradeId = lastGradeLevelId;
            context.Schools.Update(b2cSchool);
            context.SaveChanges();
            Console.WriteLine($"✅ B2C School grade range configured: Boot Camp to Grade X");
        }

        // Also seed some grades (class/sections) for NubeEra School, restricted to the
        // standardized -1 to 10 range only.
        if (!context.Grades.Any(g => g.SchoolId == b2cSchool.Id))
        {
            var levelDefs = new List<(int LevelNumber, string Name, Guid Id)>
            {
                (-1, "Boot Camp", gradeLevelIds[11]),
                (0, "Foundation Course", gradeLevelIds[10]),
                (1, "Grade I", gradeLevelIds[0]),
                (2, "Grade II", gradeLevelIds[1]),
                (3, "Grade III", gradeLevelIds[2]),
                (4, "Grade IV", gradeLevelIds[3]),
                (5, "Grade V", gradeLevelIds[4]),
                (6, "Grade VI", gradeLevelIds[5]),
                (7, "Grade VII", gradeLevelIds[6]),
                (8, "Grade VIII", gradeLevelIds[7]),
                (9, "Grade IX", gradeLevelIds[8]),
                (10, "Grade X", gradeLevelIds[9])
            };

            var grades = new List<Grade>();
            foreach (var def in levelDefs)
            {
                grades.Add(new Grade
                {
                    Id = Guid.NewGuid(),
                    SchoolId = b2cSchool.Id,
                    GradeLevelId = def.Id,
                    GradeLevel = def.LevelNumber.ToString(),
                    GradeName = def.Name,
                    IsActive = true
                });
            }
            context.Grades.AddRange(grades);
            context.SaveChanges();
            Console.WriteLine("✅ Default B2C School Grades created (Boot Camp to Grade X)");
        }

        // Deactivate any pre-existing class/section grades whose level falls outside the
        // standardized -1 to 10 range.
        var outOfRangeGrades = context.Grades
            .Where(g => g.IsActive)
            .ToList()
            .Where(g => !int.TryParse(System.Text.RegularExpressions.Regex.Match(g.GradeLevel, @"-?\d+").Value, out var lvl) || lvl < -1 || lvl > 10)
            .ToList();
        if (outOfRangeGrades.Count > 0)
        {
            foreach (var g in outOfRangeGrades)
            {
                g.IsActive = false;
            }
            context.SaveChanges();
            Console.WriteLine($"⚠️  Deactivated {outOfRangeGrades.Count} grade(s) outside the standardized -1 to 10 range");
        }

        // Admin Credentials from Config or Defaults
        string adminEmail = configuration["Seed:AdminEmail"] ?? "superadmin@nubeera.com";
        string adminPassword = configuration["Seed:AdminPassword"] ?? "SuperAdmin@123";

        // 2. Super Admin
        SeedUser(context, adminEmail, adminPassword, AppRoles.SuperAdmin, "Super", "Admin");

        // 3. Admin Users
        SeedUser(context, "admin1@nubeera.com", "Admin@123", AppRoles.Admin, "Admin", "One", defaultSchool.Id);
        
        // 4. Staff User
        SeedUser(context, "staff1@nubeera.com", "Staff@123", AppRoles.Staff, "Staff", "One", defaultSchool.Id);
 
        // 5. Principal User
        SeedUser(context, "principal1@nubeera.com", "Principal@123", AppRoles.Principal, "Principal", "One", defaultSchool.Id);
        
        // 6. Seed Default Grades (Required for Students)
        if (!context.Grades.Any(g => g.SchoolId == defaultSchool.Id))
        {
            var grades = new List<Grade>
            {
                new Grade { Id = Guid.NewGuid(), SchoolId = defaultSchool.Id, GradeLevelId = gradeLevelIds[9], GradeLevel = "10", GradeName = "Grade 10", IsActive = true },
                new Grade { Id = Guid.NewGuid(), SchoolId = defaultSchool.Id, GradeLevelId = gradeLevelIds[0], GradeLevel = "1", GradeName = "Grade 1", IsActive = true }
            };
            context.Grades.AddRange(grades);
            context.SaveChanges();
            Console.WriteLine("✅ Default Grades created");
        }
        var defaultGrade = context.Grades.FirstOrDefault(g => g.SchoolId == defaultSchool.Id);
        if (defaultGrade == null)
        {
            Console.WriteLine("❌ Error: Default grade not found and could not be created.");
            return;
        }
 
        // 7. Teacher Users
        SeedTeacher(context, "teacher1@nubeera.com", "Teacher@123", "TEACH-001", "Teacher", "One", defaultSchool.Id);
 
        // 8. Student Users
        SeedStudent(context, "student1@nubeera.com", "Student@123", "STUD-001", "Student", "One", defaultSchool.Id, defaultGrade.Id);
 
        // 9. Parent User
        SeedParent(context, "parent1@nubeera.com", "Parent@123", "Parent", "One", "+1234567890", defaultSchool.Id);
 
        // 10. System Settings
        if (!context.SystemSettings.Any(s => s.Key == "EnableCopilot"))
        {
            context.SystemSettings.Add(new SystemSetting { Key = "EnableCopilot", Value = "true" });
        }

        context.SaveChanges();
    }
 
    private static void SeedUser(AppDbContext context, string email, string password, string role, string firstName, string lastName, Guid? schoolId = null)
    {
        var roleObj = context.Roles.FirstOrDefault(r => r.RoleName == role)
            ?? throw new Exception($"Role {role} not found in database.");

        var user = context.Users.FirstOrDefault(u => u.Email == email);
        if (user == null)
        {
            user = new User(
                email: email,
                passwordHash: BCrypt.Net.BCrypt.HashPassword(password),
                roleId: roleObj.Id,
                schoolId: schoolId
            );
            user.FirstName = firstName;
            user.LastName = lastName;
            context.Users.Add(user);
            Console.WriteLine($"✅ User Seeded: {email} [Role: {role}]");
        }
        else
        {
            bool updated = false;
            // Update password if it doesn't match the standard Admin@123 or provided password
            if (!SafeVerify(password, user.PasswordHash))
            {
                user.UpdatePassword(BCrypt.Net.BCrypt.HashPassword(password));
                Console.WriteLine($"✅ User Password Updated: {email}");
                updated = true;
            }
            if (user.RoleId != roleObj.Id)
            {
                user.SetRole(roleObj.Id);
                updated = true;
            }
            if (user.SchoolId != schoolId)
            {
                user.SchoolId = schoolId;
                updated = true;
            }
            if (user.FirstName != firstName || user.LastName != lastName)
            {
                user.FirstName = firstName;
                user.LastName = lastName;
                updated = true;
            }
            if (updated)
            {
                context.Users.Update(user);
            }
        }
    }
 
    private static void SeedTeacher(AppDbContext context, string email, string password, string employeeId, string firstName, string lastName, Guid schoolId)
    {
        var roleObj = context.Roles.FirstOrDefault(r => r.RoleName == AppRoles.Teacher)
            ?? throw new Exception($"Role {AppRoles.Teacher} not found in database.");

        var user = context.Users.FirstOrDefault(u => u.Email == email);
        if (user == null)
        {
            user = new User(
                email: email,
                passwordHash: BCrypt.Net.BCrypt.HashPassword(password),
                roleId: roleObj.Id,
                schoolId: schoolId
            );
            user.FirstName = firstName;
            user.LastName = lastName;
            context.Users.Add(user);
        }
        else
        {
            bool userUpdated = false;
            if (!SafeVerify(password, user.PasswordHash))
            {
                user.UpdatePassword(BCrypt.Net.BCrypt.HashPassword(password));
                Console.WriteLine($"✅ Teacher Password Updated: {email}");
                userUpdated = true;
            }
            if (user.SchoolId != schoolId)
            {
                user.SchoolId = schoolId;
                userUpdated = true;
            }
            if (userUpdated)
            {
                context.Users.Update(user);
            }
        }

        var teacher = context.Teachers.FirstOrDefault(t => t.UserId == user.Id || t.Email == email);
        if (teacher == null)
        {
            teacher = new Teacher
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                SchoolId = schoolId,
                EmployeeId = employeeId,
                FirstName = firstName,
                LastName = lastName,
                Email = email,
                IsActive = true
            };
            context.Teachers.Add(teacher);
            Console.WriteLine($"✅ Teacher Profile Seeded: {email}");
        }
        else
        {
            teacher.UserId = user.Id;
            teacher.SchoolId = schoolId;
            teacher.EmployeeId = employeeId;
            teacher.FirstName = firstName;
            teacher.LastName = lastName;
            teacher.Email = email;
            context.Teachers.Update(teacher);
        }
    }
 
    private static void SeedStudent(AppDbContext context, string email, string password, string studentId, string firstName, string lastName, Guid schoolId, Guid gradeId)
    {
        var roleObj = context.Roles.FirstOrDefault(r => r.RoleName == AppRoles.Student)
            ?? throw new Exception($"Role {AppRoles.Student} not found in database.");

        var user = context.Users.FirstOrDefault(u => u.Email == email);
        if (user == null)
        {
            user = new User(
                email: email,
                passwordHash: BCrypt.Net.BCrypt.HashPassword(password),
                roleId: roleObj.Id,
                schoolId: schoolId
            );
            user.FirstName = firstName;
            user.LastName = lastName;
            context.Users.Add(user);
        }
        else
        {
            bool userUpdated = false;
            if (!SafeVerify(password, user.PasswordHash))
            {
                user.UpdatePassword(BCrypt.Net.BCrypt.HashPassword(password));
                Console.WriteLine($"✅ Student Password Updated: {email}");
                userUpdated = true;
            }
            if (user.SchoolId != schoolId)
            {
                user.SchoolId = schoolId;
                userUpdated = true;
            }
            if (userUpdated)
            {
                context.Users.Update(user);
            }
        }

        var student = context.Students.FirstOrDefault(s => s.UserId == user.Id || s.Email == email);
        if (student == null)
        {
            student = new Student
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                SchoolId = schoolId,
                GradeId = gradeId,
                StudentId = studentId,
                FirstName = firstName,
                LastName = lastName,
                Email = email,
                ParentGuardianPhone = "+1234567890", // Linked to parent1
                IsActive = true
            };
            context.Students.Add(student);
            Console.WriteLine($"✅ Student Profile Seeded: {email}");
        }
        else
        {
            student.UserId = user.Id;
            student.SchoolId = schoolId;
            student.GradeId = gradeId;
            student.StudentId = studentId;
            student.FirstName = firstName;
            student.LastName = lastName;
            student.Email = email;
            if (student.ParentGuardianPhone != "+1234567890")
            {
                student.ParentGuardianPhone = "+1234567890";
            }
            context.Students.Update(student);
        }
    }
 
    private static void SeedParent(AppDbContext context, string email, string password, string firstName, string lastName, string phone, Guid schoolId)
    {
        var roleObj = context.Roles.FirstOrDefault(r => r.RoleName == AppRoles.Parent)
            ?? throw new Exception($"Role {AppRoles.Parent} not found in database.");

        var user = context.Users.FirstOrDefault(u => u.Email == email);
        if (user == null)
        {
            user = new User(
                email: email,
                passwordHash: BCrypt.Net.BCrypt.HashPassword(password),
                roleId: roleObj.Id,
                schoolId: schoolId
            );
            user.FirstName = firstName;
            user.LastName = lastName;
            user.Phone = phone;
            context.Users.Add(user);
            Console.WriteLine($"✅ Parent Seeded: {email}");
        }
        else
        {
            bool updated = false;
            if (!SafeVerify(password, user.PasswordHash))
            {
                user.UpdatePassword(BCrypt.Net.BCrypt.HashPassword(password));
                Console.WriteLine($"✅ Parent Password Updated: {email}");
                updated = true;
            }
            if (user.Phone != phone)
            {
                user.Phone = phone;
                updated = true;
            }
            if (user.SchoolId != schoolId)
            {
                user.SchoolId = schoolId;
                updated = true;
            }
            if (updated)
            {
                context.Users.Update(user);
            }
        }
    }

    private static bool SafeVerify(string password, string hash)
    {
        if (string.IsNullOrEmpty(hash)) return false;
        try
        {
            return BCrypt.Net.BCrypt.Verify(password, hash);
        }
        catch (Exception)
        {
            return false;
        }
    }
}

