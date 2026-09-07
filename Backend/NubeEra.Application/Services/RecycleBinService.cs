using Microsoft.EntityFrameworkCore;
using NubeEra.Application.DTOs.RecycleBin;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Services;
using NubeEra.Domain.Entities;

namespace NubeEra.Application.Services;

/// <summary>
/// Implements Recycle Bin operations using IgnoreQueryFilters() to access soft-deleted records.
/// Each supported entity type is handled by a dedicated case in a switch expression so the
/// code remains easy to extend and avoids reflection-based magic.
/// </summary>
public class RecycleBinService : IRecycleBinService
{
    private readonly IGenericRepository<School>          _schools;
    private readonly IGenericRepository<Grade>           _grades;
    private readonly IGenericRepository<Teacher>         _teachers;
    private readonly IGenericRepository<Student>         _students;
    private readonly IGenericRepository<Module>          _modules;
    private readonly IGenericRepository<Lesson>          _lessons;
    private readonly IGenericRepository<Exam>            _exams;
    private readonly IGenericRepository<Scheduler>       _schedulers;
    private readonly IGenericRepository<Result>          _results;
    private readonly IGenericRepository<NubeEra.Domain.Entities.Event> _events;
    private readonly IGenericRepository<Ticket>          _tickets;
    private readonly IGenericRepository<Product>         _products;
    private readonly IGenericRepository<Order>           _orders;
    private readonly IGenericRepository<Certificate>     _certificates;
    private readonly IGenericRepository<User>            _users;

    public RecycleBinService(
        IGenericRepository<School>      schools,
        IGenericRepository<Grade>       grades,
        IGenericRepository<Teacher>     teachers,
        IGenericRepository<Student>     students,
        IGenericRepository<Module>      modules,
        IGenericRepository<Lesson>      lessons,
        IGenericRepository<Exam>        exams,
        IGenericRepository<Scheduler>   schedulers,
        IGenericRepository<Result>      results,
        IGenericRepository<NubeEra.Domain.Entities.Event> events,
        IGenericRepository<Ticket>      tickets,
        IGenericRepository<Product>     products,
        IGenericRepository<Order>       orders,
        IGenericRepository<Certificate> certificates,
        IGenericRepository<User>        users)
    {
        _schools       = schools;
        _grades        = grades;
        _teachers      = teachers;
        _students      = students;
        _modules       = modules;
        _lessons       = lessons;
        _exams         = exams;
        _schedulers    = schedulers;
        _results       = results;
        _events        = events;
        _tickets       = tickets;
        _products      = products;
        _orders        = orders;
        _certificates  = certificates;
        _users         = users;
    }

    // ── Supported types ──────────────────────────────────────────────────────
    public IReadOnlyList<string> SupportedEntityTypes { get; } =
    [
        "School", "Grade", "Teacher", "Student",
        "Module", "Lesson", "Exam", "Scheduler",
        "Result", "Event", "Ticket", "Product",
        "Order", "Certificate", "User",
    ];

    // ── Summary (badge counts) ───────────────────────────────────────────────
    public async Task<RecycleBinSummaryDto> GetSummaryAsync()
    {
        var counts = new Dictionary<string, int>();
        foreach (var type in SupportedEntityTypes)
        {
            counts[type] = await CountDeletedAsync(type);
        }
        return new RecycleBinSummaryDto { Counts = counts };
    }

    // ── List deleted items ───────────────────────────────────────────────────
    public async Task<RecycleBinPageDto> GetDeletedItemsAsync(
        string entityType, int page = 1, int pageSize = 20)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var (items, total) = await FetchDeletedAsync(entityType, page, pageSize);
        return new RecycleBinPageDto
        {
            Items      = items,
            TotalCount = total,
            Page       = page,
            PageSize   = pageSize,
        };
    }

    // ── Restore ──────────────────────────────────────────────────────────────
    public Task RestoreAsync(string entityType, Guid id, Guid restoredByUserId)
        => DispatchAsync(entityType, id, isRestore: true);

    // ── Permanent delete ─────────────────────────────────────────────────────
    public Task PermanentDeleteAsync(string entityType, Guid id)
        => DispatchAsync(entityType, id, isRestore: false);

    private async Task DispatchAsync(string entityType, Guid id, bool isRestore)
    {
        switch (entityType)
        {
            case "School":      await ActOn(_schools,      id, isRestore); break;
            case "Grade":       await ActOn(_grades,       id, isRestore); break;
            case "Teacher":     await ActOn(_teachers,     id, isRestore); break;
            case "Student":     await ActOn(_students,     id, isRestore); break;
            case "Module":      await ActOn(_modules,      id, isRestore); break;
            case "Lesson":      await ActOn(_lessons,      id, isRestore); break;
            case "Exam":        await ActOn(_exams,        id, isRestore); break;
            case "Scheduler":   await ActOn(_schedulers,   id, isRestore); break;
            case "Result":      await ActOn(_results,      id, isRestore); break;
            case "Event":       await ActOn(_events,       id, isRestore); break;
            case "Ticket":      await ActOn(_tickets,      id, isRestore); break;
            case "Product":     await ActOn(_products,     id, isRestore); break;
            case "Order":       await ActOn(_orders,       id, isRestore); break;
            case "Certificate": await ActOn(_certificates, id, isRestore); break;
            case "User":        await ActOn(_users,        id, isRestore); break;
            default: throw new ArgumentException($"Unsupported entity type: {entityType}");
        }
    }

    private static async Task ActOn<T>(IGenericRepository<T> repo, Guid id, bool isRestore)
        where T : NubeEra.Domain.Common.BaseEntity
    {
        var entity = await repo.Query()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(x => x.Id == id && x.IsDeleted)
            ?? throw new KeyNotFoundException($"Deleted record with id {id} not found.");

        if (isRestore)
            await repo.RestoreAsync(entity);
        else
            await repo.HardDeleteAsync(entity);
    }

    // ── Internals ────────────────────────────────────────────────────────────

    private Task<int> CountDeletedAsync(string entityType) => entityType switch
    {
        "School"      => _schools      .Query().IgnoreQueryFilters().CountAsync(x => x.IsDeleted),
        "Grade"       => _grades       .Query().IgnoreQueryFilters().CountAsync(x => x.IsDeleted),
        "Teacher"     => _teachers     .Query().IgnoreQueryFilters().CountAsync(x => x.IsDeleted),
        "Student"     => _students     .Query().IgnoreQueryFilters().CountAsync(x => x.IsDeleted),
        "Module"      => _modules      .Query().IgnoreQueryFilters().CountAsync(x => x.IsDeleted),
        "Lesson"      => _lessons      .Query().IgnoreQueryFilters().CountAsync(x => x.IsDeleted),
        "Exam"        => _exams        .Query().IgnoreQueryFilters().CountAsync(x => x.IsDeleted),
        "Scheduler"   => _schedulers   .Query().IgnoreQueryFilters().CountAsync(x => x.IsDeleted),
        "Result"      => _results      .Query().IgnoreQueryFilters().CountAsync(x => x.IsDeleted),
        "Event"       => _events       .Query().IgnoreQueryFilters().CountAsync(x => x.IsDeleted),
        "Ticket"      => _tickets      .Query().IgnoreQueryFilters().CountAsync(x => x.IsDeleted),
        "Product"     => _products     .Query().IgnoreQueryFilters().CountAsync(x => x.IsDeleted),
        "Order"       => _orders       .Query().IgnoreQueryFilters().CountAsync(x => x.IsDeleted),
        "Certificate" => _certificates .Query().IgnoreQueryFilters().CountAsync(x => x.IsDeleted),
        "User"        => _users        .Query().IgnoreQueryFilters().CountAsync(x => x.IsDeleted),
        _             => Task.FromResult(0),
    };

    private async Task<(List<RecycleBinItemDto> Items, int Total)> FetchDeletedAsync(
        string entityType, int page, int pageSize)
    {
        int skip = (page - 1) * pageSize;
        return entityType switch
        {
            "School" => await PagedDeleted(
                _schools.Query(), skip, pageSize,
                x => new RecycleBinItemDto
                {
                    Id = x.Id, EntityType = "School",
                    DisplayName = x.Name, Description = x.City,
                    DeletedDate = x.DeletedDate ?? x.CreatedAt, DeletedBy = x.DeletedBy, CreatedAt = x.CreatedAt,
                }),

            "Grade" => await PagedDeleted(
                _grades.Query(), skip, pageSize,
                x => new RecycleBinItemDto
                {
                    Id = x.Id, EntityType = "Grade",
                    DisplayName = x.GradeName,
                    DeletedDate = x.DeletedDate ?? x.CreatedAt, DeletedBy = x.DeletedBy, CreatedAt = x.CreatedAt,
                }),

            "Teacher" => await PagedDeleted(
                _teachers.Query(), skip, pageSize,
                x => new RecycleBinItemDto
                {
                    Id = x.Id, EntityType = "Teacher",
                    DisplayName = $"{x.FirstName} {x.LastName}", Description = x.Email,
                    DeletedDate = x.DeletedDate ?? x.CreatedAt, DeletedBy = x.DeletedBy, CreatedAt = x.CreatedAt,
                }),

            "Student" => await PagedDeleted(
                _students.Query(), skip, pageSize,
                x => new RecycleBinItemDto
                {
                    Id = x.Id, EntityType = "Student",
                    DisplayName = $"{x.FirstName} {x.LastName}", Description = x.Email,
                    DeletedDate = x.DeletedDate ?? x.CreatedAt, DeletedBy = x.DeletedBy, CreatedAt = x.CreatedAt,
                }),

            "Module" => await PagedDeleted(
                _modules.Query(), skip, pageSize,
                x => new RecycleBinItemDto
                {
                    Id = x.Id, EntityType = "Module",
                    DisplayName = x.Name, Description = x.Description,
                    DeletedDate = x.DeletedDate ?? x.CreatedAt, DeletedBy = x.DeletedBy, CreatedAt = x.CreatedAt,
                }),

            "Lesson" => await PagedDeleted(
                _lessons.Query(), skip, pageSize,
                x => new RecycleBinItemDto
                {
                    Id = x.Id, EntityType = "Lesson",
                    DisplayName = x.SubTopic, Description = x.Activity,
                    DeletedDate = x.DeletedDate ?? x.CreatedAt, DeletedBy = x.DeletedBy, CreatedAt = x.CreatedAt,
                }),

            "Exam" => await PagedDeleted(
                _exams.Query(), skip, pageSize,
                x => new RecycleBinItemDto
                {
                    Id = x.Id, EntityType = "Exam",
                    DisplayName = x.Title ?? "Untitled Exam",
                    DeletedDate = x.DeletedDate ?? x.CreatedAt, DeletedBy = x.DeletedBy, CreatedAt = x.CreatedAt,
                }),

            "Scheduler" => await PagedDeleted(
                _schedulers.Query(), skip, pageSize,
                x => new RecycleBinItemDto
                {
                    Id = x.Id, EntityType = "Scheduler",
                    DisplayName = $"Schedule {x.Date:yyyy-MM-dd}",
                    Description = x.IsActive ? "Active" : "Inactive",
                    DeletedDate = x.DeletedDate ?? x.CreatedAt, DeletedBy = x.DeletedBy, CreatedAt = x.CreatedAt,
                }),

            "Result" => await PagedDeleted(
                _results.Query(), skip, pageSize,
                x => new RecycleBinItemDto
                {
                    Id = x.Id, EntityType = "Result",
                    DisplayName = $"Result {x.Id.ToString()[..8]}",
                    DeletedDate = x.DeletedDate ?? x.CreatedAt, DeletedBy = x.DeletedBy, CreatedAt = x.CreatedAt,
                }),

            "Event" => await PagedDeleted(
                _events.Query(), skip, pageSize,
                x => new RecycleBinItemDto
                {
                    Id = x.Id, EntityType = "Event",
                    DisplayName = x.Title, Description = x.Venue,
                    DeletedDate = x.DeletedDate ?? x.CreatedAt, DeletedBy = x.DeletedBy, CreatedAt = x.CreatedAt,
                }),

            "Ticket" => await PagedDeleted(
                _tickets.Query(), skip, pageSize,
                x => new RecycleBinItemDto
                {
                    Id = x.Id, EntityType = "Ticket",
                    DisplayName = $"[{x.TicketNumber}] {x.Subject}",
                    Description = x.Status.ToString(),
                    DeletedDate = x.DeletedDate ?? x.CreatedAt, DeletedBy = x.DeletedBy, CreatedAt = x.CreatedAt,
                }),

            "Product" => await PagedDeleted(
                _products.Query(), skip, pageSize,
                x => new RecycleBinItemDto
                {
                    Id = x.Id, EntityType = "Product",
                    DisplayName = x.Title, Description = x.ShortDescription,
                    DeletedDate = x.DeletedDate ?? x.CreatedAt, DeletedBy = x.DeletedBy, CreatedAt = x.CreatedAt,
                }),

            "Order" => await PagedDeleted(
                _orders.Query(), skip, pageSize,
                x => new RecycleBinItemDto
                {
                    Id = x.Id, EntityType = "Order",
                    DisplayName = $"Order #{x.OrderNumber}", Description = x.Status,
                    DeletedDate = x.DeletedDate ?? x.CreatedAt, DeletedBy = x.DeletedBy, CreatedAt = x.CreatedAt,
                }),

            "Certificate" => await PagedDeleted(
                _certificates.Query(), skip, pageSize,
                x => new RecycleBinItemDto
                {
                    Id = x.Id, EntityType = "Certificate",
                    DisplayName = x.CertificateNumber, Description = x.StudentName,
                    DeletedDate = x.DeletedDate ?? x.CreatedAt, DeletedBy = x.DeletedBy, CreatedAt = x.CreatedAt,
                }),

            "User" => await PagedDeleted(
                _users.Query(), skip, pageSize,
                x => new RecycleBinItemDto
                {
                    Id = x.Id, EntityType = "User",
                    DisplayName = string.IsNullOrEmpty(x.FirstName)
                        ? x.Email
                        : $"{x.FirstName} {x.LastName}".Trim(),
                    Description = x.Email,
                    DeletedDate = x.DeletedDate ?? x.CreatedAt, DeletedBy = x.DeletedBy, CreatedAt = x.CreatedAt,
                }),

            _ => ([], 0),
        };
    }

    // ── Pagination helper ────────────────────────────────────────────────────

    private static async Task<(List<RecycleBinItemDto> Items, int Total)> PagedDeleted<T>(
        IQueryable<T> baseQuery,
        int skip,
        int take,
        Func<T, RecycleBinItemDto> project)
        where T : NubeEra.Domain.Common.BaseEntity
    {
        var q = baseQuery
            .IgnoreQueryFilters()
            .Where(x => x.IsDeleted)
            .OrderByDescending(x => x.DeletedDate);

        var total = await q.CountAsync();
        var items = await q.Skip(skip).Take(take).ToListAsync();
        return (items.Select(project).ToList(), total);
    }
}
