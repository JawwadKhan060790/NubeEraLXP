using System;
using System.Collections.Generic;
using NubeEra.Domain.Common;

namespace NubeEra.Domain.Entities;

public class Order : BaseEntity
{
    public string OrderNumber { get; set; } = null!;
    public Guid UserId { get; set; }
    public Guid? StudentId { get; set; }
    public string StudentName { get; set; } = null!;
    public string ParentName { get; set; } = null!;
    public Guid? SchoolId { get; set; }
    public string SchoolName { get; set; } = null!;
    public string ShippingAddress { get; set; } = null!;
    public string PinCode { get; set; } = null!;
    public string City { get; set; } = null!;
    public string State { get; set; } = null!;
    public string Country { get; set; } = null!;
    public string ContactNumber { get; set; } = null!;
    public string? AlternateContactNumber { get; set; }
    public string? OrderNotes { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DeliveryCharges { get; set; }
    public decimal TotalAmount { get; set; }
    
    // Status can be: Order Placed, Confirmed, Packed, Out for Delivery, Delivered, Cancelled
    public string Status { get; set; } = "Order Placed";
    public string? DeliveryNotes { get; set; }
    public DateTime? EstimatedDeliveryDate { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Navigation Properties
    public User User { get; set; } = null!;
    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}
