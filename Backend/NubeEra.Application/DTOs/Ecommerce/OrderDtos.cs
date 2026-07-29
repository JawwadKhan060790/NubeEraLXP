using System;
using System.Collections.Generic;

namespace NubeEra.Application.DTOs;

public class PlaceOrderRequest
{
    public string ShippingAddress { get; set; } = null!;
    public string PinCode { get; set; } = null!;
    public string City { get; set; } = null!;
    public string State { get; set; } = null!;
    public string Country { get; set; } = null!;
    public string ContactNumber { get; set; } = null!;
    public string? AlternateContactNumber { get; set; }
    public string? OrderNotes { get; set; }
    public Guid? StudentId { get; set; }
    public string? StudentName { get; set; }
    public string? ParentName { get; set; }
}

public class UpdateStatusRequest
{
    public string Status { get; set; } = null!;
    public string? DeliveryNotes { get; set; }
    public DateTime? EstimatedDeliveryDate { get; set; }
}

public class OrderResponseDto
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; } = null!;
    public string StudentName { get; set; } = null!;
    public string ParentName { get; set; } = null!;
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
    public string Status { get; set; } = null!;
    public string? DeliveryNotes { get; set; }
    public DateTime? EstimatedDeliveryDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<OrderItemResponseDto> OrderItems { get; set; } = new();
}

public class OrderItemResponseDto
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string ProductTitle { get; set; } = null!;
    public string ProductSku { get; set; } = null!;
    public decimal Price { get; set; }
    public int Quantity { get; set; }
}
