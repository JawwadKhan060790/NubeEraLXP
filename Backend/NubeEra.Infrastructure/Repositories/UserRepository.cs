using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Domain.Entities;
using NubeEra.Infrastructure.Persistence.DbContext;

namespace NubeEra.Infrastructure.Repositories;

public class UserRepository : GenericRepository<User>, IUserRepository
{
    public UserRepository(AppDbContext context, ILogger<GenericRepository<User>> logger)
        : base(context, logger)
    {
    }

    public UserRepository(AppDbContext context, ILogger<GenericRepository<User>> logger, ICurrentUserService currentUserService)
        : base(context, logger, currentUserService)
    {
    }

    public async Task<User?> GetByEmailAsync(string email, Func<IQueryable<User>, IQueryable<User>>? include = null)
    {
        IQueryable<User> query = _dbSet;
        
        if (include != null)
        {
            query = include(query);
        }

        return await query
            .Include(u => u.Role)
            .Include(u => u.TeacherProfile)
            .Include(u => u.StudentProfile).ThenInclude(s => s.Grade)
            .FirstOrDefaultAsync(x => x.Email.ToLower() == email.ToLower() && x.IsActive);
    }

    public async Task<User?> GetByUsernameAsync(string username, Func<IQueryable<User>, IQueryable<User>>? include = null)
    {
        IQueryable<User> query = _dbSet;
        
        if (include != null)
        {
            query = include(query);
        }

        return await query
            .Include(u => u.Role)
            .Include(u => u.TeacherProfile)
            .Include(u => u.StudentProfile).ThenInclude(s => s.Grade)
            .FirstOrDefaultAsync(x => x.Username != null && x.Username.ToLower() == username.ToLower() && x.IsActive);
    }

    public async Task<User?> GetByEmailOrPhoneAsync(string identifier, Func<IQueryable<User>, IQueryable<User>>? include = null)
    {
        IQueryable<User> query = _dbSet;
        
        if (include != null)
        {
            query = include(query);
        }

        var clean = identifier.Trim();
        var lower = clean.ToLower();
        var digitsOnly = new string(clean.Where(char.IsDigit).ToArray());
        var parentEmailVariant = $"{lower}@veriton.parent";
        var prefixParentEmailVariant = $"parent_{lower}@veriton.parent";
        var strippedPhone = lower.EndsWith("@veriton.parent")
            ? lower.Replace("@veriton.parent", "").Replace("parent_", "")
            : "";

        return await query
            .Include(u => u.Role)
            .Include(u => u.TeacherProfile)
            .Include(u => u.StudentProfile).ThenInclude(s => s.Grade)
            .FirstOrDefaultAsync(x => (
                x.Email.ToLower() == lower ||
                (x.Username != null && x.Username.ToLower() == lower) ||
                (!string.IsNullOrEmpty(x.Phone) && x.Phone == clean) ||
                (!string.IsNullOrEmpty(digitsOnly) && !string.IsNullOrEmpty(x.Phone) && x.Phone == digitsOnly) ||
                x.Email.ToLower() == parentEmailVariant ||
                x.Email.ToLower() == prefixParentEmailVariant ||
                (!string.IsNullOrEmpty(strippedPhone) && (x.Phone == strippedPhone || x.Email.ToLower() == strippedPhone))
            ) && x.IsActive);
    }
}

