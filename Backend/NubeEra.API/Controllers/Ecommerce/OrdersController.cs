using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Services.Ecommerce;

namespace NubeEra.API.Controllers.Ecommerce;

[ApiController]
[Route("api/ecommerce/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;

    public OrdersController(IOrderService orderService)
    {
        _orderService = orderService;
    }

    [HttpPost("place")]
    public async Task<IActionResult> PlaceOrder([FromBody] PlaceOrderRequest request)
    {
        var result = await _orderService.PlaceOrderAsync(request);
        return Ok(result);
    }

    [HttpGet("my-orders")]
    public async Task<IActionResult> GetMyOrders()
    {
        var result = await _orderService.GetMyOrdersAsync();
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrderById(Guid id)
    {
        var result = await _orderService.GetByIdAsync(id);
        return Ok(result);
    }

    [HttpGet("{id}/tracking")]
    public async Task<IActionResult> GetOrderTracking(Guid id)
    {
        var result = await _orderService.GetOrderTrackingAsync(id);
        return Ok(result);
    }

    [HttpPost("{id}/reorder")]
    public async Task<IActionResult> Reorder(Guid id)
    {
        await _orderService.ReorderAsync(id);
        return Ok(new { message = "Items from previous order placed back to your cart." });
    }

    [HttpGet("admin")]
    [Authorize(Roles = "Staff,Admin")]
    public async Task<IActionResult> GetAdminOrders(
        [FromQuery] string? search,
        [FromQuery] Guid? schoolId,
        [FromQuery] string? status,
        [FromQuery] DateTime? date)
    {
        var result = await _orderService.GetAdminOrdersAsync(search, schoolId, status, date);
        return Ok(result);
    }

    [HttpPut("{id}/status")]
    [Authorize(Policy = "StaffOnly")]
    public async Task<IActionResult> UpdateOrderStatus(Guid id, [FromBody] UpdateStatusRequest request)
    {
        var result = await _orderService.UpdateOrderStatusAsync(id, request);
        return Ok(result);
    }

    [HttpGet("{id}/invoice")]
    public async Task<IActionResult> GetInvoice(Guid id)
    {
        var result = await _orderService.GetInvoiceAsync(id);
        return Ok(result);
    }
}
