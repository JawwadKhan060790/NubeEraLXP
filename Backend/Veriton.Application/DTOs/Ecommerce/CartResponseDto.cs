using System;
using System.Collections.Generic;

namespace Veriton.Application.DTOs;

public class CartProductResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? ShortDescription { get; set; }
    public decimal Price { get; set; }
    public decimal? DiscountPrice { get; set; }
    public string? ThumbnailUrl { get; set; }
    public int StockQuantity { get; set; }
    public bool IsAvailable { get; set; }
    public string? BrandName { get; set; }
    public string? SkuCode { get; set; }
}

public class CartItemResponse
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
    public bool SavedForLater { get; set; }
    public DateTime CreatedAt { get; set; }
    public CartProductResponse Product { get; set; } = null!;
}

public class CartSummaryResponse
{
    public decimal Subtotal { get; set; }
    public decimal DeliveryCharges { get; set; }
    public decimal TotalAmount { get; set; }
}

public class CartResponseDto
{
    public List<CartItemResponse> Items { get; set; } = new();
    public CartSummaryResponse Summary { get; set; } = null!;
}
