using FluentValidation;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Entities;
using NubeEra.Application.Interfaces.Security;
using Microsoft.EntityFrameworkCore;

namespace NubeEra.Application.Services;

public class GenericSchoolService
    : IGenericService<SchoolCreateDto, SchoolUpdateDto, SchoolDto>
{
    private readonly IGenericRepository<School> _repository;
    private readonly IUserRepository _userRepository;
    private readonly ICurrentUserService _currentUserService;
    private readonly IGenericRepository<Role> _roleRepository;
    private readonly IGenericRepository<GradeLevel> _gradeLevelRepository;
    private readonly IGenericRepository<Grade> _gradeRepository;
    private readonly ISchoolGradeRangeService _schoolGradeRangeService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IValidator<SchoolCreateDto> _createValidator;
    private readonly IValidator<SchoolUpdateDto> _updateValidator;

    public GenericSchoolService(
        IGenericRepository<School> repository,
        IUserRepository userRepository,
        ICurrentUserService currentUserService,
        IGenericRepository<Role> roleRepository,
        IGenericRepository<GradeLevel> gradeLevelRepository,
        IGenericRepository<Grade> gradeRepository,
        ISchoolGradeRangeService schoolGradeRangeService,
        IUnitOfWork unitOfWork,
        IValidator<SchoolCreateDto> createValidator,
        IValidator<SchoolUpdateDto> updateValidator)
    {
        _repository = repository;
        _userRepository = userRepository;
        _currentUserService = currentUserService;
        _roleRepository = roleRepository;
        _gradeLevelRepository = gradeLevelRepository;
        _gradeRepository = gradeRepository;
        _schoolGradeRangeService = schoolGradeRangeService;
        _unitOfWork = unitOfWork;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    public async Task<List<SchoolDto>> GetAllAsync()
    {
        IEnumerable<School> schools = await _repository.GetAllAsync(q => q.Include(s => s.FromGrade).Include(s => s.ToGrade));

        return schools.Select(MapToDto).ToList();
    }

    public async Task<SchoolDto?> GetByIdAsync(Guid id)
    {
        var s = await _repository.GetByIdAsync(id, q => q.Include(x => x.FromGrade).Include(x => x.ToGrade));
        if (s == null) return null;

        return MapToDto(s);
    }

    public async Task<Guid> CreateAsync(SchoolCreateDto dto)
    {
        var validation = await _createValidator.ValidateAsync(dto);
        if (!validation.IsValid) throw new FluentValidation.ValidationException(validation.Errors);

        var allSchools = await _repository.GetAllAsync();
        if (allSchools.Any(s => s.SchoolCode.Trim().ToLower() == dto.SchoolCode.Trim().ToLower()))
        {
            throw new Exception($"School with code '{dto.SchoolCode}' already exists.");
        }

        // QA issue #18: School Name must also be unique. Previously only SchoolCode was
        // checked, so the exact same Name could be reused across many schools — admins
        // then have no human-readable way to tell schools apart (SchoolCode isn't
        // memorable) and risk picking the wrong one in dropdowns/reports.
        if (allSchools.Any(s => s.Name.Trim().ToLower() == dto.Name.Trim().ToLower()))
        {
            throw new Exception($"A school named '{dto.Name}' already exists. School names must be unique.");
        }

        // QA issue #17: a duplicate Principal login/email must be REJECTED, not silently
        // allowed. The previous implementation looked up the email deep inside the
        // Principal-creation step below and, on a match, silently reassigned that
        // EXISTING account (and its School/Role) to the new school — meaning the same
        // login could end up "taking over" an unrelated account instead of the create
        // failing with a clear "already in use" error. Checking it here, before any row
        // is written, both fixes the bug and keeps the transaction below focused on
        // genuine I/O failures rather than expected validation failures.
        if (!string.IsNullOrWhiteSpace(dto.PrincipalEmail))
        {
            var existingUser = await _userRepository.GetByEmailAsync(dto.PrincipalEmail.Trim().ToLower());
            if (existingUser != null)
            {
                throw new Exception($"The login/email '{dto.PrincipalEmail}' is already in use by another account. Please use a different principal email.");
            }
        }

        // Resolve the standardized grade-range (FromGrade/ToGrade as numbers 1-10) to the
        // system-defined GradeLevel master record IDs — School stores FK references so the
        // range always points at real, immutable master data (referential integrity).
        var (fromGradeId, toGradeId) = await ResolveGradeRangeIdsAsync(dto.FromGrade, dto.ToGrade);

        // QA issue #21: School + Principal-User creation must be atomic. GenericRepository's
        // AddAsync calls SaveChangesAsync() immediately and independently for each entity, so
        // without an explicit transaction a failure while creating the Principal would leave
        // an orphaned, half-created School row behind with no way to complete it later — the
        // exact "half entries… database rollback should be called" complaint reported.
        return await _unitOfWork.ExecuteAsync(async () =>
        {
            var school = new School
            {
                SchoolCode = dto.SchoolCode,
                Name = dto.Name,
                Address = dto.Address,
                ContactEmail = dto.ContactEmail,
                ContactPhone = dto.ContactPhone,
                LogoUrl = dto.LogoUrl,
                PrincipalName = dto.PrincipalName,
                PrincipalEmail = dto.PrincipalEmail,
                PrincipalPhone = dto.PrincipalPhone,
                FromGradeId = fromGradeId,
                ToGradeId = toGradeId,
                IsActive = true
            };

            await _repository.AddAsync(school);

            // QA request: selecting a FromGrade/ToGrade range on the School form must
            // automatically provision a Grade row for every standardized level in that
            // range (e.g. From=7th, To=10th => Grade rows for 7th, 8th, 9th, 10th are
            // created automatically) — schools previously had to create each Grade by hand.
            await EnsureGradesForRangeAsync(school.Id, fromGradeId, toGradeId);

            // Create Principal User (uniqueness already verified above)
            if (!string.IsNullOrWhiteSpace(dto.PrincipalEmail))
            {
                var principalRole = (await _roleRepository.GetAllAsync(q => q.Where(r => r.RoleName == "Principal"))).FirstOrDefault()
                    ?? throw new Exception("Principal role not found in database.");

                var password = string.IsNullOrEmpty(dto.PrincipalPassword) ? "Principal@123" : dto.PrincipalPassword;
                var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);
                var user = new User(dto.PrincipalEmail.Trim().ToLower(), passwordHash, principalRole.Id, school.Id);

                // Split name if possible
                var names = dto.PrincipalName?.Split(' ', 2);
                user.FirstName = names?.Length > 0 ? names[0] : dto.PrincipalName;
                user.LastName = names?.Length > 1 ? names[1] : "";
                user.Phone = dto.PrincipalPhone;

                await _userRepository.AddAsync(user);
            }

            return school.Id;
        });
    }

    public async Task UpdateAsync(Guid id, SchoolUpdateDto dto)
    {
        var validation = await _updateValidator.ValidateAsync(dto);
        if (!validation.IsValid) throw new FluentValidation.ValidationException(validation.Errors);

        // QA issue #18: same Name-uniqueness rule as CreateAsync, excluding this school itself.
        var allSchools = await _repository.GetAllAsync();
        if (allSchools.Any(s => s.Id != id && s.Name.Trim().ToLower() == dto.Name.Trim().ToLower()))
        {
            throw new Exception($"A school named '{dto.Name}' already exists. School names must be unique.");
        }
        if (allSchools.Any(s => s.Id != id && s.SchoolCode.Trim().ToLower() == dto.SchoolCode.Trim().ToLower()))
        {
            throw new Exception($"School with code '{dto.SchoolCode}' already exists.");
        }

        var (fromGradeId, toGradeId) = await ResolveGradeRangeIdsAsync(dto.FromGrade, dto.ToGrade);

        // Defense-in-depth: the validator already blocks "active without a valid range",
        // but enforce it again here at the domain/service boundary too.
        if (dto.IsActive && (fromGradeId == null || toGradeId == null))
        {
            throw new Exception("School cannot be activated without a valid grade range configuration (From Grade and To Grade).");
        }

        // QA issue #21: same atomicity concern as CreateAsync applies here — updating the
        // School row and then failing to update/create its Principal must not leave a
        // half-updated state behind ("i tried to edit it but after update same error is
        // giving" was the direct symptom of this method's lack of a transaction).
        await _unitOfWork.ExecuteAsync(async () =>
        {
            var school = await _repository.GetByIdAsync(id)
                ?? throw new Exception("School not found");

            school.SchoolCode = dto.SchoolCode;
            school.Name = dto.Name;
            school.Address = dto.Address;
            school.ContactEmail = dto.ContactEmail;
            school.ContactPhone = dto.ContactPhone;
            school.LogoUrl = dto.LogoUrl;
            school.PrincipalName = dto.PrincipalName;
            school.PrincipalEmail = dto.PrincipalEmail;
            school.PrincipalPhone = dto.PrincipalPhone;
            school.FromGradeId = fromGradeId;
            school.ToGradeId = toGradeId;
            school.IsActive = dto.IsActive;

            await _repository.UpdateAsync(school);

            // Same auto-provisioning as CreateAsync: if the grade range was widened on
            // edit (e.g. ToGrade moved from 10th to 12th — once a wider range exists),
            // make sure the newly-included levels get a Grade row too. Never removes or
            // deactivates existing Grade rows for levels that fall outside a narrowed
            // range — that stays a manual/explicit action so in-progress class data
            // (students, schedules, exams) is never silently orphaned.
            await EnsureGradesForRangeAsync(id, fromGradeId, toGradeId);

            // Update or Create Principal User
            if (!string.IsNullOrEmpty(dto.PrincipalEmail))
            {
                var users = await _userRepository.GetAllAsync(q => q.Include(u => u.Role).Where(u => u.SchoolId == id && u.Role.RoleName == "Principal"));
                var principal = users.FirstOrDefault();

                if (principal != null)
                {
                    // Update existing principal
                    var names = dto.PrincipalName?.Split(' ', 2);
                    principal.FirstName = names?.Length > 0 ? names[0] : dto.PrincipalName;
                    principal.LastName = names?.Length > 1 ? names[1] : "";
                    principal.Phone = dto.PrincipalPhone;

                    // Email update is tricky if it's already taken by another user
                    if (principal.Email.ToLower() != dto.PrincipalEmail.ToLower())
                    {
                        var existingWithEmail = await _userRepository.GetByEmailAsync(dto.PrincipalEmail.Trim().ToLower());
                        if (existingWithEmail != null && existingWithEmail.Id != principal.Id)
                        {
                            throw new Exception("Email is already in use by another user.");
                        }
                        principal.UpdateEmail(dto.PrincipalEmail.Trim().ToLower());
                    }

                    if (!string.IsNullOrEmpty(dto.PrincipalPassword))
                    {
                        principal.UpdatePassword(BCrypt.Net.BCrypt.HashPassword(dto.PrincipalPassword));
                    }

                    await _userRepository.UpdateAsync(principal);
                }
                else
                {
                    // Create new principal if none existed for this school. QA issue #17:
                    // verify the email isn't already used by a DIFFERENT account before
                    // creating — previously this branch had no such check at all and would
                    // let the raw DB unique-constraint exception leak out as a generic 500.
                    var existingWithEmail = await _userRepository.GetByEmailAsync(dto.PrincipalEmail.Trim().ToLower());
                    if (existingWithEmail != null)
                    {
                        throw new Exception($"The login/email '{dto.PrincipalEmail}' is already in use by another account. Please use a different principal email.");
                    }

                    var principalRole = (await _roleRepository.GetAllAsync(q => q.Where(r => r.RoleName == "Principal"))).FirstOrDefault()
                        ?? throw new Exception("Principal role not found in database.");

                    var password = string.IsNullOrEmpty(dto.PrincipalPassword) ? "Principal@123" : dto.PrincipalPassword;
                    var passwordHash = BCrypt.Net.BCrypt.HashPassword(password);
                    var user = new User(dto.PrincipalEmail.Trim().ToLower(), passwordHash, principalRole.Id, id);

                    var names = dto.PrincipalName?.Split(' ', 2);
                    user.FirstName = names?.Length > 0 ? names[0] : dto.PrincipalName;
                    user.LastName = names?.Length > 1 ? names[1] : "";
                    user.Phone = dto.PrincipalPhone;

                    await _userRepository.AddAsync(user);
                }
            }
        });

        // The cached grade range is now stale — invalidate so every dropdown/filter/report
        // immediately reflects the new range (single source of truth, no stale reads).
        _schoolGradeRangeService.InvalidateCache(id);
    }

    public async Task DeleteAsync(Guid id)
    {
        await _unitOfWork.ExecuteAsync(async () =>
        {
            var school = await _repository.GetByIdAsync(id)
                ?? throw new Exception("School not found");

            // Optionally delete the principal user as well
            var users = await _userRepository.GetAllAsync(q => q.Include(u => u.Role).Where(u => u.SchoolId == id && u.Role.RoleName == "Principal"));
            foreach (var user in users)
            {
                // QA issue #20: recreating a school with the same details after deleting
                // the original failed with a duplicate-key error. Root cause: `users.Email`
                // and `schools.SchoolCode` both have a hard, unconditional UNIQUE KEY at the
                // database level that has no idea about the IsDeleted soft-delete flag — a
                // soft-deleted row still physically occupies that email/code, so re-using it
                // for a brand-new School/Principal keeps failing even though the app-level
                // "already exists" checks (which DO respect IsDeleted via the EF global query
                // filter) report it as free. Freeing the unique value here, at the moment of
                // soft-delete, lets that exact email/code be reused immediately afterward.
                // NOTE: this value is intentionally still recognizable (original value kept as
                // a prefix) for Recycle Bin browsing, but restoring this user from the Recycle
                // Bin will surface the suffixed email — an admin must rename it back manually.
                user.UpdateEmail(MakeUniqueAfterDelete(user.Email, user.Id, maxLength: 150));
                await _userRepository.UpdateAsync(user);
                await _userRepository.DeleteAsync(user);
            }

            // Same fix applied to the School's own unique SchoolCode — see comment above.
            school.SchoolCode = MakeUniqueAfterDelete(school.SchoolCode, school.Id, maxLength: 50);
            await _repository.UpdateAsync(school);
            await _repository.DeleteAsync(school);
        });

        _schoolGradeRangeService.InvalidateCache(id);
    }

    /// <summary>
    /// Frees up a DB-level-unique column value at soft-delete time so it can be reused by a
    /// brand-new row, while keeping a recognizable trace of the original value for Recycle
    /// Bin review. See the QA issue #20 comment in DeleteAsync for the full rationale.
    /// </summary>
    private static string MakeUniqueAfterDelete(string original, Guid id, int maxLength)
    {
        var suffix = $"~del~{id:N}";
        var keep = Math.Max(0, maxLength - suffix.Length);
        var trimmedOriginal = original.Length > keep ? original[..keep] : original;
        return trimmedOriginal + suffix;
    }

    /// <summary>
    /// Maps numeric grade-range bounds (1-10, as entered on the School form) to the
    /// corresponding system-defined GradeLevel master record IDs. Throws if a numeric
    /// value is supplied that does not correspond to a standardized grade level — this
    /// guarantees the FK always references real master data (no orphaned/free-text grades).
    /// </summary>
    private async Task<(Guid? FromGradeId, Guid? ToGradeId)> ResolveGradeRangeIdsAsync(int? fromGrade, int? toGrade)
    {
        if (fromGrade == null && toGrade == null) return (null, null);

        var levels = await _gradeLevelRepository.GetAllAsync(q => q.Where(g => g.IsActive));
        var byNumber = levels.ToDictionary(l => l.LevelNumber, l => l.Id);

        Guid? fromId = null;
        Guid? toId = null;

        if (fromGrade.HasValue)
        {
            if (!byNumber.TryGetValue(fromGrade.Value, out var id))
                throw new Exception($"'{fromGrade.Value}' is not a valid standardized grade level (must be -1 to 10).");
            fromId = id;
        }

        if (toGrade.HasValue)
        {
            if (!byNumber.TryGetValue(toGrade.Value, out var id))
                throw new Exception($"'{toGrade.Value}' is not a valid standardized grade level (must be -1 to 10).");
            toId = id;
        }

        return (fromId, toId);
    }

    /// <summary>
    /// Auto-provisions a Grade row for every standardized GradeLevel between
    /// fromGradeId and toGradeId (inclusive) that this school doesn't already have.
    /// Non-destructive: only ever ADDS missing levels, never deletes/deactivates a
    /// level that ends up outside a subsequently-narrowed range.
    /// </summary>
    private async Task EnsureGradesForRangeAsync(Guid schoolId, Guid? fromGradeId, Guid? toGradeId)
    {
        if (fromGradeId == null || toGradeId == null) return;

        var levels = await _gradeLevelRepository.GetAllAsync(q => q.Where(g => g.IsActive));
        var byId = levels.ToDictionary(l => l.Id, l => l);
        if (!byId.TryGetValue(fromGradeId.Value, out var fromLevel) ||
            !byId.TryGetValue(toGradeId.Value, out var toLevel))
        {
            return;
        }

        var lowNumber = Math.Min(fromLevel.LevelNumber, toLevel.LevelNumber);
        var highNumber = Math.Max(fromLevel.LevelNumber, toLevel.LevelNumber);
        var levelsInRange = levels.Where(l => l.LevelNumber >= lowNumber && l.LevelNumber <= highNumber).ToList();

        // Existing Grade rows for this school (the school-scoped, non-academic-year-specific
        // ones — AcademicYear == null — since those are the "base" rows this auto-provisioning
        // manages; year-specific Grade rows are a separate, explicit workflow).
        var existingGrades = await _gradeRepository.GetAllAsync(q =>
            q.Where(g => g.SchoolId == schoolId && g.AcademicYear == null));
        var existingLevelIds = existingGrades
            .Where(g => g.GradeLevelId.HasValue)
            .Select(g => g.GradeLevelId!.Value)
            .ToHashSet();
        // Also match on the legacy GradeLevel number-string for older rows that predate the
        // GradeLevelId FK and may still have it null — without this, those legacy rows would
        // be invisible to the check above and we'd attempt a duplicate insert that violates
        // the (SchoolId, GradeLevel, AcademicYear) unique index.
        var existingLevelNumbers = existingGrades
            .Select(g => g.GradeLevel)
            .Where(gl => !string.IsNullOrWhiteSpace(gl))
            .ToHashSet();

        foreach (var level in levelsInRange)
        {
            if (existingLevelIds.Contains(level.Id)) continue;
            if (existingLevelNumbers.Contains(level.LevelNumber.ToString())) continue;

            var grade = new Grade
            {
                SchoolId = schoolId,
                GradeLevelId = level.Id,
                GradeLevel = level.LevelNumber.ToString(),
                GradeName = level.Name,
                Capacity = 0,
                IsActive = true
            };

            await _gradeRepository.AddAsync(grade);
        }
    }

    private static SchoolDto MapToDto(School s)
    {
        var hasValidRange = s.FromGrade != null && s.ToGrade != null && s.FromGrade.LevelNumber <= s.ToGrade.LevelNumber;

        return new SchoolDto
        {
            Id = s.Id,
            SchoolCode = s.SchoolCode,
            Name = s.Name,
            Address = s.Address,
            ContactEmail = s.ContactEmail,
            ContactPhone = s.ContactPhone,
            LogoUrl = s.LogoUrl,
            PrincipalName = s.PrincipalName,
            PrincipalEmail = s.PrincipalEmail,
            PrincipalPhone = s.PrincipalPhone,
            IsActive = s.IsActive,
            FromGrade = s.FromGrade?.LevelNumber,
            ToGrade = s.ToGrade?.LevelNumber,
            FromGradeName = s.FromGrade?.Name,
            ToGradeName = s.ToGrade?.Name,
            HasValidGradeRange = hasValidRange
        };
    }
}
