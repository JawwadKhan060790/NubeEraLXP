using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Veriton.Application.DTOs;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Application.Interfaces.Services;
using Veriton.Application.Interfaces.Security;
using Veriton.Domain.Entities;
using Veriton.Domain.Common;

namespace Veriton.Application.Services;

public class CartService : ICartService
{
    private readonly IGenericRepository<CartItem> _cartRepository;
    private readonly IGenericRepository<Product> _productRepository;
    private readonly IGenericRepository<WishlistItem> _wishlistRepository;
    private readonly ICurrentUserService _currentUserService;

    public CartService(
        IGenericRepository<CartItem> cartRepository,
        IGenericRepository<Product> productRepository,
        IGenericRepository<WishlistItem> wishlistRepository,
        ICurrentUserService currentUserService)
    {
        _cartRepository = cartRepository;
        _productRepository = productRepository;
        _wishlistRepository = wishlistRepository;
        _currentUserService = currentUserService;
    }

    private Guid GetCurrentUserId()
    {
        var userIdStr = _currentUserService.UserId;
        if (string.IsNullOrEmpty(userIdStr)) throw new UnauthorizedAccessException("User not logged in.");
        return Guid.Parse(userIdStr);
    }

    public async Task<CartResponseDto> GetCartAsync()
    {
        var userId = GetCurrentUserId();
        
        var items = await _cartRepository.GetAllAsync(q => q
            .Include(c => c.Product)
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.CreatedAt));

        var itemResponses = items.Select(c => new CartItemResponse
        {
            Id = c.Id,
            ProductId = c.ProductId,
            Quantity = c.Quantity,
            SavedForLater = c.SavedForLater,
            CreatedAt = c.CreatedAt,
            Product = new CartProductResponse
            {
                Id = c.Product.Id,
                Title = c.Product.Title,
                ShortDescription = c.Product.ShortDescription,
                Price = c.Product.Price,
                DiscountPrice = c.Product.DiscountPrice,
                ThumbnailUrl = c.Product.ThumbnailUrl,
                StockQuantity = c.Product.StockQuantity,
                IsAvailable = c.Product.IsAvailable,
                BrandName = c.Product.BrandName,
                SkuCode = c.Product.SkuCode
            }
        }).ToList();

        // Calculate Summary
        decimal subtotal = 0;
        foreach (var item in itemResponses.Where(i => !i.SavedForLater))
        {
            var price = item.Product.DiscountPrice ?? item.Product.Price;
            subtotal += price * item.Quantity;
        }

        decimal deliveryCharges = EcommerceConstants.CalculateDeliveryCharges(subtotal);
        decimal totalAmount = subtotal + deliveryCharges;

        return new CartResponseDto
        {
            Items = itemResponses,
            Summary = new CartSummaryResponse
            {
                Subtotal = subtotal,
                DeliveryCharges = deliveryCharges,
                TotalAmount = totalAmount
            }
        };
    }

    public async Task AddToCartAsync(CreateCartItemRequest request)
    {
        var userId = GetCurrentUserId();
        var product = await _productRepository.GetByIdAsync(request.ProductId);
        if (product == null) throw new AppException("Product not found.");

        if (product.StockQuantity < request.Quantity)
            throw new AppException($"Only {product.StockQuantity} items in stock.");

        var existingItems = await _cartRepository.GetAllAsync(q => q
            .Where(c => c.UserId == userId && c.ProductId == request.ProductId));
        var existingItem = existingItems.FirstOrDefault();

        if (existingItem != null)
        {
            existingItem.Quantity += request.Quantity;
            if (existingItem.Quantity > product.StockQuantity)
            {
                existingItem.Quantity = product.StockQuantity;
            }
            await _cartRepository.UpdateAsync(existingItem);
        }
        else
        {
            var newItem = new CartItem
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ProductId = request.ProductId,
                Quantity = request.Quantity,
                SavedForLater = false,
                CreatedAt = DateTime.UtcNow
            };
            await _cartRepository.AddAsync(newItem);
        }
    }

    public async Task UpdateQuantityAsync(Guid itemId, UpdateCartItemQuantityRequest request)
    {
        var userId = GetCurrentUserId();
        var item = await _cartRepository.GetByIdAsync(itemId, q => q.Include(c => c.Product));
        if (item == null || item.UserId != userId) throw new AppException("Cart item not found.");

        if (request.Quantity <= 0)
        {
            await _cartRepository.DeleteAsync(item);
        }
        else
        {
            if (item.Product.StockQuantity < request.Quantity)
                throw new AppException($"Only {item.Product.StockQuantity} items in stock.");

            item.Quantity = request.Quantity;
            await _cartRepository.UpdateAsync(item);
        }
    }

    public async Task ToggleSaveForLaterAsync(Guid itemId, bool save)
    {
        var userId = GetCurrentUserId();
        var item = await _cartRepository.GetByIdAsync(itemId);
        if (item == null || item.UserId != userId) throw new AppException("Cart item not found.");

        item.SavedForLater = save;
        await _cartRepository.UpdateAsync(item);
    }

    public async Task MoveToWishlistAsync(Guid itemId)
    {
        var userId = GetCurrentUserId();
        var cartItem = await _cartRepository.GetByIdAsync(itemId);
        if (cartItem == null || cartItem.UserId != userId) throw new AppException("Cart item not found.");

        var wishlistItems = await _wishlistRepository.GetAllAsync(q => 
            q.Where(w => w.UserId == userId && w.ProductId == cartItem.ProductId));
        var alreadyInWishlist = wishlistItems.Any();

        if (!alreadyInWishlist)
        {
            var wishlistItem = new WishlistItem
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ProductId = cartItem.ProductId,
                CreatedAt = DateTime.UtcNow
            };
            await _wishlistRepository.AddAsync(wishlistItem);
        }

        await _cartRepository.DeleteAsync(cartItem);
    }

    public async Task RemoveFromCartAsync(Guid itemId)
    {
        var userId = GetCurrentUserId();
        var item = await _cartRepository.GetByIdAsync(itemId);
        if (item == null || item.UserId != userId) throw new AppException("Cart item not found.");

        await _cartRepository.DeleteAsync(item);
    }

    public async Task ClearCartAsync()
    {
        var userId = GetCurrentUserId();
        var items = await _cartRepository.GetAllAsync(q => q.Where(c => c.UserId == userId));
        foreach (var item in items)
        {
            await _cartRepository.DeleteAsync(item);
        }
    }
}
