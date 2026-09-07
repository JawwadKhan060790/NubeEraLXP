using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using NubeEra.Domain.Common;

namespace NubeEra.Application.Interfaces.Repositories
{
    public interface IGenericRepository<T> where T : BaseEntity
    {
        IQueryable<T> Query();
        Task<List<T>> GetAllAsync(Func<IQueryable<T>, IQueryable<T>>? include = null);
        Task<T?> GetByIdAsync(Guid id, Func<IQueryable<T>, IQueryable<T>>? include = null);
        Task AddAsync(T entity);
        Task UpdateAsync(T entity);
        /// <summary>Soft-deletes the entity (sets IsDeleted = true). Preferred over HardDeleteAsync.</summary>
        Task DeleteAsync(T entity, Guid? deletedByUserId = null);
        /// <summary>Permanently removes the record from the database. SuperAdmin only.</summary>
        Task HardDeleteAsync(T entity);
        /// <summary>Restores a soft-deleted entity (clears IsDeleted, DeletedDate, DeletedBy).</summary>
        Task RestoreAsync(T entity);
        Task<int> CountAsync(Func<IQueryable<T>, IQueryable<T>>? filter = null);
        void Detach(T entity);
    }
}
