namespace Veriton.Application.Interfaces;

/// <summary>
/// Wraps an explicit database transaction spanning multiple repository calls.
///
/// GenericRepository's AddAsync/UpdateAsync/DeleteAsync each call SaveChangesAsync()
/// immediately and independently, so a multi-step write (e.g. creating a School row
/// AND its Principal User row) is NOT atomic by default — if the second call fails,
/// the first one stays committed, leaving a "half entry" behind. Wrap such multi-step
/// writes in a transaction obtained here so a failure anywhere rolls back everything
/// already written in this scope. (Fixes the "database rollback should be called to
/// avoid half entries" QA report on School creation/update.)
/// </summary>
public interface IUnitOfWork
{
    Task<IUnitOfWorkTransaction> BeginTransactionAsync();
    Task ExecuteAsync(Func<Task> action);
    Task<T> ExecuteAsync<T>(Func<Task<T>> action);
}

/// <summary>A single in-flight transaction. Call CommitAsync() on success; if it is
/// disposed without being committed (e.g. an exception was thrown), the underlying
/// EF Core transaction rolls back automatically.</summary>
public interface IUnitOfWorkTransaction : IAsyncDisposable
{
    Task CommitAsync();
    Task RollbackAsync();
}
