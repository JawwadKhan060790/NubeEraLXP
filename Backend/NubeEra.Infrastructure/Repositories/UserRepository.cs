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

    public async Task<User?> GetByEmailOrPhoneAsync(string identifier, Func<IQueryable<User>, IQueryable<User>>? include = null)
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
            .FirstOrDefaultAsync(x => (x.Email.ToLower() == identifier.ToLower() || x.Phone == identifier) && x.IsActive);
    }
}

