using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Veriton.Application.Interfaces.Repositories;
using Veriton.Application.Interfaces.Services.Ecommerce;
using Veriton.Domain.Entities;

namespace Veriton.Application.Services.Ecommerce;

public class EcommerceDashboardService : IEcommerceDashboardService
{
    private readonly IGenericRepository<Order> _orderRepository;
    private readonly IGenericRepository<Product> _productRepository;
    private readonly IGenericRepository<OrderItem> _orderItemRepository;

    public EcommerceDashboardService(
        IGenericRepository<Order> orderRepository,
        IGenericRepository<Product> productRepository,
        IGenericRepository<OrderItem> orderItemRepository)
    {
        _orderRepository = orderRepository;
        _productRepository = productRepository;
        _orderItemRepository = orderItemRepository;
    }

    public async Task<object> GetStatsAsync()
    {
        var totalOrders = await _orderRepository.CountAsync();
        var pendingOrders = await _orderRepository.CountAsync(q => q
            .Where(o => o.Status == "Order Placed" || o.Status == "Confirmed" || o.Status == "Packed" || o.Status == "Out for Delivery"));
        var deliveredOrders = await _orderRepository.CountAsync(q => q.Where(o => o.Status == "Delivered"));
        var cancelledOrders = await _orderRepository.CountAsync(q => q.Where(o => o.Status == "Cancelled"));

        var totalProducts = await _productRepository.CountAsync();
        var lowStockProducts = await _productRepository.CountAsync(q => q.Where(p => p.StockQuantity <= 5 && p.IsVisible));

        // 1. Top Selling Products
        var orderItems = await _orderItemRepository.GetAllAsync();
        var topProducts = orderItems
            .GroupBy(oi => new { oi.ProductId, oi.ProductTitle })
            .Select(g => new
            {
                ProductId = g.Key.ProductId,
                Title = g.Key.ProductTitle,
                QuantitySold = g.Sum(oi => oi.Quantity),
                Revenue = g.Sum(oi => oi.Price * oi.Quantity)
            })
            .OrderByDescending(x => x.QuantitySold)
            .Take(5)
            .ToList();

        // 2. Orders by School
        var orders = await _orderRepository.GetAllAsync();
        var ordersBySchool = orders
            .GroupBy(o => o.SchoolName)
            .Select(g => new
            {
                SchoolName = g.Key,
                Count = g.Count(),
                Revenue = g.Sum(o => o.TotalAmount)
            })
            .OrderByDescending(x => x.Count)
            .ToList();

        // 3. Monthly Trends (Last 6 Months)
        var sixMonthsAgo = DateTime.UtcNow.AddMonths(-6);
        var ordersInPeriod = orders.Where(o => o.CreatedAt >= sixMonthsAgo).ToList();

        var monthlyTrends = ordersInPeriod
            .GroupBy(o => new { o.CreatedAt.Year, o.CreatedAt.Month })
            .Select(g => new
            {
                MonthName = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMM yyyy"),
                Year = g.Key.Year,
                Month = g.Key.Month,
                Count = g.Count(),
                Revenue = g.Sum(o => o.TotalAmount)
            })
            .OrderBy(x => x.Year).ThenBy(x => x.Month)
            .ToList();

        // 4. Low stock products list details
        var lowStockProductsList = await _productRepository.GetAllAsync(q => q
            .Include(p => p.Category)
            .Where(p => p.StockQuantity <= 5 && p.IsVisible)
            .OrderBy(p => p.StockQuantity)
            .Take(10));

        var lowStockList = lowStockProductsList.Select(p => new
        {
            p.Id,
            p.Title,
            p.SkuCode,
            CategoryName = p.Category?.Name ?? "Uncategorized",
            p.StockQuantity,
            p.Price
        }).ToList();

        return new
        {
            totalOrders,
            pendingOrders,
            deliveredOrders,
            cancelledOrders,
            totalProducts,
            lowStockProducts,
            topProducts,
            ordersBySchool,
            monthlyTrends,
            lowStockList
        };
    }
}
