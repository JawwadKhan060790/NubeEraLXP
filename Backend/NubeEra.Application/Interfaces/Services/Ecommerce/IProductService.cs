using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using NubeEra.Domain.Entities;

namespace NubeEra.Application.Interfaces.Services.Ecommerce;

public interface IProductService
{
    Task<List<Product>> GetProductsAsync(
        string? search,
        Guid? categoryId,
        decimal? minPrice,
        decimal? maxPrice,
        bool? isAvailable,
        string? brand,
        string? tag,
        string? schoolGrade,
        bool? isFeatured,
        bool? isTrending,
        bool? isNewArrival,
        string? sortBy);

    Task<List<Product>> GetProductsAdminAsync();
    Task<Product?> GetByIdAsync(Guid id);
    Task<List<Product>> GetRelatedAsync(Guid id);
    Task<Product> CreateAsync(Product product);
    Task<Product> UpdateAsync(Guid id, Product updatedProduct);
    Task DeleteAsync(Guid id);
}
