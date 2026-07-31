using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Application.Interfaces.Services.Ecommerce;
using Veriton.Application.Interfaces.Security;
using Veriton.Domain.Entities;
using Veriton.Domain.Common;

namespace Veriton.Application.Services.Ecommerce;

public class WishlistService : IWishlistService
{
    private readonly IGenericRepository<WishlistItem> _wishlistRepository;
    private readonly IGenericRepository<Product> _productRepository;
    private readonly IGenericRepository<CartItem> _cartRepository;
    private readonly ICurrentUserService _currentUserService;

    public WishlistService(
        IGenericRepository<WishlistItem> wishlistRepository,
        IGenericRepository<Product> productRepository,
        IGenericRepository<CartItem> cartRepository,
        ICurrentUserService currentUserService)
    {
        _wishlistRepository = wishlistRepository;
        _productRepository = productRepository;
        _cartRepository = cartRepository;
        _currentUserService = currentUserService;
    }

    private Guid GetCurrentUserId()
    {
        var userIdStr = _currentUserService.UserId;
        if (string.IsNullOrEmpty(userIdStr)) throw new UnauthorizedAccessException("User not logged in.");
        return Guid.Parse(userIdStr);
    }

    public async Task<List<object>> GetWishlistAsync()
    {
        var userId = GetCurrentUserId();
        var items = await _wishlistRepository.GetAllAsync(q => q
            .Include(w => w.Product)
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.CreatedAt));

        return items.Select(w => (object)new
        {
            w.Id,
            w.ProductId,
            w.CreatedAt,
            Product = new
            {
                w.Product.Id,
                w.Product.Title,
                w.Product.ShortDescription,
                w.Product.Price,
                w.Product.DiscountPrice,
                w.Product.ThumbnailUrl,
                w.Product.StockQuantity,
                w.Product.IsAvailable,
                w.Product.BrandName,
                w.Product.SkuCode
            }
        }).ToList();
    }

    public async Task AddToWishlistAsync(Guid productId)
    {
        var userId = GetCurrentUserId();
        var product = await _productRepository.GetByIdAsync(productId);
        if (product == null) throw new AppException("Product not found.");

        var existingItems = await _wishlistRepository.GetAllAsync(q => 
            q.Where(w => w.UserId == userId && w.ProductId == productId));

        if (existingItems.Any()) return;

        var newItem = new WishlistItem
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            ProductId = productId,
            CreatedAt = DateTime.UtcNow
        };

        await _wishlistRepository.AddAsync(newItem);
    }

    public async Task MoveToCartAsync(Guid itemId)
    {
        var userId = GetCurrentUserId();
        var wishItem = await _wishlistRepository.GetByIdAsync(itemId);
        if (wishItem == null || wishItem.UserId != userId) throw new AppException("Wishlist item not found.");

        var product = await _productRepository.GetByIdAsync(wishItem.ProductId);
        if (product == null) throw new AppException("Product not found.");

        if (product.StockQuantity <= 0)
            throw new AppException("Product is currently out of stock.");

        var existingCarts = await _cartRepository.GetAllAsync(q => 
            q.Where(c => c.UserId == userId && c.ProductId == wishItem.ProductId));
        var cartItem = existingCarts.FirstOrDefault();

        if (cartItem != null)
        {
            cartItem.Quantity += 1;
            await _cartRepository.UpdateAsync(cartItem);
        }
        else
        {
            var newCart = new CartItem
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ProductId = wishItem.ProductId,
                Quantity = 1,
                SavedForLater = false,
                CreatedAt = DateTime.UtcNow
            };
            await _cartRepository.AddAsync(newCart);
        }

        await _wishlistRepository.DeleteAsync(wishItem);
    }

    public async Task RemoveFromWishlistAsync(Guid itemId)
    {
        var userId = GetCurrentUserId();
        var item = await _wishlistRepository.GetByIdAsync(itemId);
        if (item == null || item.UserId != userId) throw new AppException("Wishlist item not found.");

        await _wishlistRepository.DeleteAsync(item);
    }
}
