using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Veriton.Application.DTOs;

namespace Veriton.Application.Interfaces.Services.Ecommerce;

public interface IOrderService
{
    Task<object> PlaceOrderAsync(PlaceOrderRequest request);
    Task<List<object>> GetMyOrdersAsync();
    Task<object> GetByIdAsync(Guid id);
    Task<object> GetOrderTrackingAsync(Guid id);
    Task ReorderAsync(Guid id);
    Task<List<object>> GetAdminOrdersAsync(string? search, Guid? schoolId, string? status, DateTime? date);
    Task<object> UpdateOrderStatusAsync(Guid id, UpdateStatusRequest request);
    Task<object> GetInvoiceAsync(Guid id);
}
