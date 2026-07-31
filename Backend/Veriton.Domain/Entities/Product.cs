using System;
using Veriton.Domain.Common;

namespace Veriton.Domain.Entities;

public class Product : BaseEntity
{
    public string Title { get; set; } = null!;
    public string? ShortDescription { get; set; }
    public string? FullDescription { get; set; }
    public Guid CategoryId { get; set; }
    public string? Subcategory { get; set; }
    public string SkuCode { get; set; } = null!;
    public string? Barcode { get; set; }
    public decimal Price { get; set; }
    public decimal? DiscountPrice { get; set; }
    
    // Serialized JSON fields
    public string ImagesJson { get; set; } = "[]"; // List of gallery image URLs
    public string? ThumbnailUrl { get; set; }
    public int StockQuantity { get; set; }
    public bool IsAvailable { get; set; } = true;
    public string? BrandName { get; set; }
    public decimal? Weight { get; set; }
    public string? Dimensions { get; set; }
    public string? WarrantyDetails { get; set; }
    public string? SafetyInstructions { get; set; }
    public string FeaturesJson { get; set; } = "[]"; // List of features
    public string SpecificationsJson { get; set; } = "{}"; // Key-value details
    public string? RecommendedAgeGroup { get; set; }
    public string? SchoolGradeCompatibility { get; set; }
    public string TagsJson { get; set; } = "[]"; // List of tag tags
    
    public bool IsFeatured { get; set; }
    public bool IsTrending { get; set; }
    public bool IsNewArrival { get; set; }
    public int MinOrderQuantity { get; set; } = 1;
    public int MaxOrderQuantity { get; set; } = 99;
    public string? ShippingType { get; set; }
    public string? DeliveryEstimate { get; set; }
    public string? ReturnPolicy { get; set; }
    public bool IsVisible { get; set; } = true;
    public DateTime? UpdatedAt { get; set; }

    // Navigation Properties
    public ProductCategory? Category { get; set; }
}
