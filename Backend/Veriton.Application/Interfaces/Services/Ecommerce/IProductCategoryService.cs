using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Veriton.Domain.Entities;

namespace Veriton.Application.Interfaces.Services.Ecommerce;

public interface IProductCategoryService
{
    Task<List<ProductCategory>> GetAllAsync();
    Task<List<ProductCategory>> GetAllAdminAsync();
    Task<ProductCategory?> GetByIdAsync(Guid id);
    Task<ProductCategory> CreateAsync(ProductCategory category);
    Task<ProductCategory> UpdateAsync(Guid id, ProductCategory updatedCategory);
    Task DeleteAsync(Guid id);
}
