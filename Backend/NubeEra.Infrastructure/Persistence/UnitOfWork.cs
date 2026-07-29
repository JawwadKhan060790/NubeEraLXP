using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using NubeEra.Application.Interfaces;
using NubeEra.Infrastructure.Persistence.DbContext;

namespace NubeEra.Infrastructure.Persistence;

/// <summary>EF Core-backed implementation of <see cref="IUnitOfWork"/>. See that
/// interface for why this exists (atomicity across GenericRepository calls).</summary>
public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IUnitOfWorkTransaction> BeginTransactionAsync()
    {
        var transaction = await _context.Database.BeginTransactionAsync();
        return new EfUnitOfWorkTransaction(transaction);
    }

    public async Task ExecuteAsync(Func<Task> action)
    {
        var strategy = _context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                await action();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });
    }

    public async Task<T> ExecuteAsync<T>(Func<Task<T>> action)
    {
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var result = await action();
                await transaction.CommitAsync();
                return result;
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });
    }

    private sealed class EfUnitOfWorkTransaction : IUnitOfWorkTransaction
    {
        private readonly IDbContextTransaction _transaction;
        private bool _completed;

        public EfUnitOfWorkTransaction(IDbContextTransaction transaction)
        {
            _transaction = transaction;
        }

        public async Task CommitAsync()
        {
            await _transaction.CommitAsync();
            _completed = true;
        }

        public async Task RollbackAsync()
        {
            await _transaction.RollbackAsync();
            _completed = true;
        }

        public async ValueTask DisposeAsync()
        {
            // If the caller threw before calling CommitAsync()/RollbackAsync(),
            // disposing without committing rolls the transaction back automatically.
            if (!_completed)
            {
                await _transaction.RollbackAsync();
            }
            await _transaction.DisposeAsync();
        }
    }
}
