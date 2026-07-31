using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Application.Interfaces.Services.Ecommerce;
using Veriton.Domain.Entities;
using Veriton.Domain.Common;

namespace Veriton.Application.Services.Ecommerce;

public class ProductCategoryService : IProductCategoryService
{
    private readonly IGenericRepository<ProductCategory> _categoryRepository;
    private readonly IGenericRepository<Product> _productRepository;

    public ProductCategoryService(
        IGenericRepository<ProductCategory> categoryRepository,
        IGenericRepository<Product> productRepository)
    {
        _categoryRepository = categoryRepository;
        _productRepository = productRepository;
    }

    public async Task<List<ProductCategory>> GetAllAsync()
    {
        return await _categoryRepository.GetAllAsync(q => q
            .Where(c => c.IsActive)
            .OrderBy(c => c.Name));
    }

    public async Task<List<ProductCategory>> GetAllAdminAsync()
    {
        return await _categoryRepository.GetAllAsync(q => q.OrderBy(c => c.Name));
    }

    public async Task<ProductCategory?> GetByIdAsync(Guid id)
    {
        return await _categoryRepository.GetByIdAsync(id);
    }

    public async Task<ProductCategory> CreateAsync(ProductCategory category)
    {
        if (string.IsNullOrWhiteSpace(category.Name))
            throw new AppException("Category name is required.");

        category.Id = Guid.NewGuid();
        category.CreatedAt = DateTime.UtcNow;
        category.UpdatedAt = DateTime.UtcNow;
        category.IsActive = true;

        await _categoryRepository.AddAsync(category);
        return category;
    }

    public async Task<ProductCategory> UpdateAsync(Guid id, ProductCategory updatedCategory)
    {
        var category = await _categoryRepository.GetByIdAsync(id);
        if (category == null) throw new AppException("Category not found.");

        if (string.IsNullOrWhiteSpace(updatedCategory.Name))
            throw new AppException("Category name is required.");

        category.Name = updatedCategory.Name;
        category.Description = updatedCategory.Description;
        category.IsActive = updatedCategory.IsActive;
        category.UpdatedAt = DateTime.UtcNow;

        await _categoryRepository.UpdateAsync(category);
        return category;
    }

    public async Task DeleteAsync(Guid id)
    {
        var category = await _categoryRepository.GetByIdAsync(id);
        if (category == null) throw new AppException("Category not found.");

        var productsCount = await _productRepository.CountAsync(q => q.Where(p => p.CategoryId == id));
        if (productsCount > 0)
        {
            throw new AppException($"Cannot delete category. There are {productsCount} products assigned to it.");
        }

        await _categoryRepository.DeleteAsync(category);
    }
}
