using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using System;
using System.Collections.Generic;
using System.Linq;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Domain.Common;
using NubeEra.Infrastructure.Persistence.DbContext;

namespace NubeEra.Infrastructure.Repositories
{
    public class GenericRepository<T> : IGenericRepository<T>
        where T : BaseEntity
    {
        protected readonly AppDbContext _context;
        protected readonly DbSet<T> _dbSet;
        private readonly ILogger<GenericRepository<T>> _logger;
        private readonly ICurrentUserService? _currentUserService;

        // Overload for when logger/current-user are not provided (uses NullLogger, no audit user)
        public GenericRepository(AppDbContext context) : this(context, NullLogger<GenericRepository<T>>.Instance, null)
        {
        }

        // Overload preserved for existing call sites that only pass a logger explicitly
        // (e.g. UserRepository's base(...) call) — still resolves no current-user.
        public GenericRepository(AppDbContext context, ILogger<GenericRepository<T>> logger)
            : this(context, logger, null)
        {
        }

        // Primary constructor used by DI: the framework's default service provider
        // selects the constructor with the most resolvable parameters, so registering
        // ICurrentUserService (already required by most services) is picked up here
        // automatically without any change to DependencyInjection.cs.
        public GenericRepository(AppDbContext context, ILogger<GenericRepository<T>> logger, ICurrentUserService? currentUserService)
        {
            _context = context;
            _dbSet = context.Set<T>();
            _logger = logger;
            _currentUserService = currentUserService;
        }

        /// <summary>Resolves the current authenticated user's Id (if any) for audit stamping.</summary>
        private Guid? ResolveCurrentUserId()
        {
            var idStr = _currentUserService?.UserId;
            return Guid.TryParse(idStr, out var id) ? id : (Guid?)null;
        }

        // Expose queryable for advanced queries
        public IQueryable<T> Query()
        {
            return _dbSet;
        }

        public async Task<List<T>> GetAllAsync(Func<IQueryable<T>, IQueryable<T>>? include = null)
        {
            IQueryable<T> query = _dbSet;
            if (include != null) query = include(query);
            return await query.AsNoTracking().ToListAsync();
        }

        public async Task<T?> GetByIdAsync(Guid id, Func<IQueryable<T>, IQueryable<T>>? include = null)
        {
            try
            {
                IQueryable<T> query = _dbSet;
                if (include != null) query = include(query);
                return await query.FirstOrDefaultAsync(x => x.Id == id);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex.InnerException, "Inner exception details");
                throw;
            }
        }

        public async Task AddAsync(T entity)
        {
            if (entity.Id == Guid.Empty)
            {
                entity.Id = Guid.NewGuid();
            }
            entity.CreatedAt = DateTime.UtcNow;
            entity.CreatedBy = ResolveCurrentUserId();
            await _dbSet.AddAsync(entity);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "DbUpdateException in AddAsync for entity {EntityType} with Id {EntityId}", typeof(T).Name, entity.Id);
                if (ex.InnerException != null)
                {
                    _logger.LogError(ex.InnerException, "Inner exception details");
                }
                throw;
            }
        }

        public async Task UpdateAsync(T entity)
        {
            entity.UpdatedDate = DateTime.UtcNow;
            entity.UpdatedBy = ResolveCurrentUserId();
            AttachForWrite(entity, EntityState.Modified);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "DbUpdateException in UpdateAsync for entity {EntityType} with Id {EntityId}", typeof(T).Name, entity.Id);
                if (ex.InnerException != null)
                {
                    _logger.LogError(ex.InnerException, "Inner exception details");
                }
                throw;
            }
        }

        /// <summary>
        /// Soft-deletes the entity: sets IsDeleted = true, records who deleted it and when.
        /// The record remains in the database but is excluded from normal queries via the global query filter.
        /// </summary>
        public async Task DeleteAsync(T entity, Guid? deletedByUserId = null)
        {
            entity.IsDeleted   = true;
            entity.DeletedDate = DateTime.UtcNow;
            entity.DeletedBy   = deletedByUserId;
            AttachForWrite(entity, EntityState.Modified);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "DbUpdateException in DeleteAsync (soft) for entity {EntityType} with Id {EntityId}", typeof(T).Name, entity.Id);
                if (ex.InnerException != null) _logger.LogError(ex.InnerException, "Inner exception details");
                throw;
            }
        }

        /// <summary>
        /// Permanently removes the record from the database. Reserved for SuperAdmin Recycle Bin.
        /// </summary>
        public async Task HardDeleteAsync(T entity)
        {
            _dbSet.Remove(entity);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "DbUpdateException in HardDeleteAsync for entity {EntityType} with Id {EntityId}", typeof(T).Name, entity.Id);
                if (ex.InnerException != null) _logger.LogError(ex.InnerException, "Inner exception details");
                throw;
            }
        }

        /// <summary>
        /// Restores a soft-deleted entity: clears IsDeleted, DeletedDate, and DeletedBy.
        /// </summary>
        public async Task RestoreAsync(T entity)
        {
            entity.IsDeleted   = false;
            entity.DeletedDate = null;
            entity.DeletedBy   = null;
            AttachForWrite(entity, EntityState.Modified);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "DbUpdateException in RestoreAsync for entity {EntityType} with Id {EntityId}", typeof(T).Name, entity.Id);
                if (ex.InnerException != null) _logger.LogError(ex.InnerException, "Inner exception details");
                throw;
            }
        }

        public async Task<int> CountAsync(Func<IQueryable<T>, IQueryable<T>>? filter = null)
        {
            IQueryable<T> query = _dbSet;
            if (filter != null) query = filter(query);
            return await query.CountAsync();
        }

        public void Detach(T entity)
        {
            _context.Entry(entity).State = EntityState.Detached;
        }

        /// <summary>
        /// Attaches <paramref name="entity"/> to the context for a write (Update/soft-Delete/
        /// Restore). All read methods on this repository use AsNoTracking, so callers that
        /// fetch a row, mutate it, and save — and then, later in the same request, fetch the
        /// *same* row again (e.g. a different service method re-querying it) — get back a
        /// second, distinct CLR instance with the same Id. The first instance is still tracked
        /// in this (request-scoped) DbContext from its earlier save, so calling
        /// `_dbSet.Update(entity)` / `context.Entry(entity).State = ...` on the second instance
        /// throws: "The instance of entity type 'X' cannot be tracked because another instance
        /// with the same key value for {'Id'} is already being tracked."
        ///
        /// If a different instance with the same key is already tracked, merge this entity's
        /// values into the existing tracked entry instead of attaching a duplicate. Otherwise,
        /// attach normally.
        /// </summary>
        private void AttachForWrite(T entity, EntityState state)
        {
            var tracked = _context.ChangeTracker.Entries<T>()
                .FirstOrDefault(e => e.Entity.Id == entity.Id);

            if (tracked != null && !ReferenceEquals(tracked.Entity, entity))
            {
                tracked.CurrentValues.SetValues(entity);
            }
            else
            {
                _context.Entry(entity).State = state;
            }
        }
    }
}
