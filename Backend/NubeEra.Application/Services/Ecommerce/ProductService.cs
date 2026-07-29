using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Services.Ecommerce;
using NubeEra.Domain.Entities;
using NubeEra.Domain.Common;

namespace NubeEra.Application.Services.Ecommerce;

public class ProductService : IProductService
{
    private readonly IGenericRepository<Product> _productRepository;
    private readonly IGenericRepository<CartItem> _cartRepository;
    private readonly IGenericRepository<WishlistItem> _wishlistRepository;

    public ProductService(
        IGenericRepository<Product> productRepository,
        IGenericRepository<CartItem> cartRepository,
        IGenericRepository<WishlistItem> wishlistRepository)
    {
        _productRepository = productRepository;
        _cartRepository = cartRepository;
        _wishlistRepository = wishlistRepository;
    }

    public async Task<List<Product>> GetProductsAsync(
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
        string? sortBy)
    {
        return await _productRepository.GetAllAsync(q =>
        {
            var query = q.Include(p => p.Category).Where(p => p.IsVisible);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower().Trim();
                query = query.Where(p => p.Title.ToLower().Contains(searchLower) 
                    || (p.ShortDescription != null && p.ShortDescription.ToLower().Contains(searchLower))
                    || (p.BrandName != null && p.BrandName.ToLower().Contains(searchLower))
                    || (p.TagsJson != null && p.TagsJson.ToLower().Contains(searchLower)));
            }

            if (categoryId.HasValue)
            {
                query = query.Where(p => p.CategoryId == categoryId.Value);
            }

            if (minPrice.HasValue)
            {
                query = query.Where(p => (p.DiscountPrice ?? p.Price) >= minPrice.Value);
            }

            if (maxPrice.HasValue)
            {
                query = query.Where(p => (p.DiscountPrice ?? p.Price) <= maxPrice.Value);
            }

            if (isAvailable.HasValue && isAvailable.Value)
            {
                query = query.Where(p => p.IsAvailable && p.StockQuantity > 0);
            }

            if (!string.IsNullOrWhiteSpace(brand))
            {
                query = query.Where(p => p.BrandName == brand);
            }

            if (!string.IsNullOrWhiteSpace(schoolGrade))
            {
                query = query.Where(p => p.SchoolGradeCompatibility != null && p.SchoolGradeCompatibility.Contains(schoolGrade));
            }

            if (isFeatured.HasValue && isFeatured.Value)
            {
                query = query.Where(p => p.IsFeatured);
            }

            if (isTrending.HasValue && isTrending.Value)
            {
                query = query.Where(p => p.IsTrending);
            }

            if (isNewArrival.HasValue && isNewArrival.Value)
            {
                query = query.Where(p => p.IsNewArrival);
            }

            if (!string.IsNullOrWhiteSpace(tag))
            {
                var tagLower = tag.ToLower().Trim();
                query = query.Where(p => p.TagsJson != null && p.TagsJson.ToLower().Contains(tagLower));
            }

            query = sortBy?.ToLower().Trim() switch
            {
                "price_asc" => query.OrderBy(p => p.DiscountPrice ?? p.Price),
                "price_desc" => query.OrderByDescending(p => p.DiscountPrice ?? p.Price),
                "latest" => query.OrderByDescending(p => p.CreatedAt),
                "popular" => query.OrderByDescending(p => p.IsTrending).ThenByDescending(p => p.CreatedAt),
                "featured" => query.OrderByDescending(p => p.IsFeatured).ThenByDescending(p => p.CreatedAt),
                _ => query.OrderByDescending(p => p.CreatedAt)
            };

            return query;
        });
    }

    public async Task<List<Product>> GetProductsAdminAsync()
    {
        return await _productRepository.GetAllAsync(q => q
            .Include(p => p.Category)
            .OrderByDescending(p => p.CreatedAt));
    }

    public async Task<Product?> GetByIdAsync(Guid id)
    {
        return await _productRepository.GetByIdAsync(id, q => q.Include(p => p.Category));
    }

    public async Task<List<Product>> GetRelatedAsync(Guid id)
    {
        var product = await _productRepository.GetByIdAsync(id);
        if (product == null) throw new AppException("Product not found.");

        return await _productRepository.GetAllAsync(q => q
            .Include(p => p.Category)
            .Where(p => p.Id != id && p.CategoryId == product.CategoryId && p.IsVisible)
            .Take(4));
    }

    public async Task<Product> CreateAsync(Product product)
    {
        if (string.IsNullOrWhiteSpace(product.Title))
            throw new AppException("Product title is required.");
        if (string.IsNullOrWhiteSpace(product.SkuCode))
            throw new AppException("Product SKU code is required.");

        var existingSku = await _productRepository.GetAllAsync(q => 
            q.Where(p => p.SkuCode.ToLower() == product.SkuCode.ToLower()));
        
        if (existingSku.Any())
            throw new AppException($"SKU Code '{product.SkuCode}' already exists.");

        product.Id = Guid.NewGuid();
        product.CreatedAt = DateTime.UtcNow;
        product.UpdatedAt = DateTime.UtcNow;
        product.IsAvailable = product.StockQuantity > 0;

        await _productRepository.AddAsync(product);
        return product;
    }

    public async Task<Product> UpdateAsync(Guid id, Product updatedProduct)
    {
        var product = await _productRepository.GetByIdAsync(id);
        if (product == null) throw new AppException("Product not found.");

        if (string.IsNullOrWhiteSpace(updatedProduct.Title))
            throw new AppException("Product title is required.");
        if (string.IsNullOrWhiteSpace(updatedProduct.SkuCode))
            throw new AppException("Product SKU code is required.");

        var existingSku = await _productRepository.GetAllAsync(q => 
            q.Where(p => p.Id != id && p.SkuCode.ToLower() == updatedProduct.SkuCode.ToLower()));
        
        if (existingSku.Any())
            throw new AppException($"SKU Code '{updatedProduct.SkuCode}' already exists by another product.");

        product.Title = updatedProduct.Title;
        product.ShortDescription = updatedProduct.ShortDescription;
        product.FullDescription = updatedProduct.FullDescription;
        product.CategoryId = updatedProduct.CategoryId;
        product.Subcategory = updatedProduct.Subcategory;
        product.SkuCode = updatedProduct.SkuCode;
        product.Barcode = updatedProduct.Barcode;
        product.Price = updatedProduct.Price;
        product.DiscountPrice = updatedProduct.DiscountPrice;
        product.ImagesJson = updatedProduct.ImagesJson;
        product.ThumbnailUrl = updatedProduct.ThumbnailUrl;
        product.StockQuantity = updatedProduct.StockQuantity;
        product.IsAvailable = updatedProduct.StockQuantity > 0;
        product.BrandName = updatedProduct.BrandName;
        product.Weight = updatedProduct.Weight;
        product.Dimensions = updatedProduct.Dimensions;
        product.WarrantyDetails = updatedProduct.WarrantyDetails;
        product.SafetyInstructions = updatedProduct.SafetyInstructions;
        product.FeaturesJson = updatedProduct.FeaturesJson;
        product.SpecificationsJson = updatedProduct.SpecificationsJson;
        product.RecommendedAgeGroup = updatedProduct.RecommendedAgeGroup;
        product.SchoolGradeCompatibility = updatedProduct.SchoolGradeCompatibility;
        product.TagsJson = updatedProduct.TagsJson;
        product.IsFeatured = updatedProduct.IsFeatured;
        product.IsTrending = updatedProduct.IsTrending;
        product.IsNewArrival = updatedProduct.IsNewArrival;
        product.MinOrderQuantity = updatedProduct.MinOrderQuantity;
        product.MaxOrderQuantity = updatedProduct.MaxOrderQuantity;
        product.ShippingType = updatedProduct.ShippingType;
        product.DeliveryEstimate = updatedProduct.DeliveryEstimate;
        product.ReturnPolicy = updatedProduct.ReturnPolicy;
        product.IsVisible = updatedProduct.IsVisible;
        product.UpdatedAt = DateTime.UtcNow;

        await _productRepository.UpdateAsync(product);
        return product;
    }

    public async Task DeleteAsync(Guid id)
    {
        var product = await _productRepository.GetByIdAsync(id);
        if (product == null) throw new AppException("Product not found.");

        // Remove from related carts/wishlists first to avoid cascade error
        var carts = await _cartRepository.GetAllAsync(q => q.Where(c => c.ProductId == id));
        foreach (var cart in carts)
        {
            await _cartRepository.DeleteAsync(cart);
        }

        var wishlists = await _wishlistRepository.GetAllAsync(q => q.Where(w => w.ProductId == id));
        foreach (var wishlist in wishlists)
        {
            await _wishlistRepository.DeleteAsync(wishlist);
        }

        await _productRepository.DeleteAsync(product);
    }
}
