namespace Veriton.Application.Interfaces.Services;

public interface IGenericService<TCreate, TUpdate, TResponse>
{
    Task<List<TResponse>> GetAllAsync();
    Task<TResponse?> GetByIdAsync(Guid id);
    Task<Guid> CreateAsync(TCreate dto);
    Task UpdateAsync(Guid id, TUpdate dto);
    Task DeleteAsync(Guid id);
}
