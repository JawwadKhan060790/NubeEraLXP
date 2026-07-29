using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using NubeEra.Application.DTOs;
using NubeEra.Application.Interfaces.Repositories;
using NubeEra.Application.Interfaces.Services.Ecommerce;
using NubeEra.Application.Interfaces.Security;
using NubeEra.Domain.Entities;
using NubeEra.Domain.Common;

namespace NubeEra.Application.Services.Ecommerce;

public class OrderService : IOrderService
{
    private readonly IGenericRepository<Order> _orderRepository;
    private readonly IGenericRepository<OrderItem> _orderItemRepository;
    private readonly IGenericRepository<CartItem> _cartRepository;
    private readonly IGenericRepository<Product> _productRepository;
    private readonly IGenericRepository<User> _userRepository;
    private readonly IGenericRepository<Student> _studentRepository;
    private readonly IGenericRepository<School> _schoolRepository;
    private readonly ICurrentUserService _currentUserService;

    public OrderService(
        IGenericRepository<Order> orderRepository,
        IGenericRepository<OrderItem> orderItemRepository,
        IGenericRepository<CartItem> cartRepository,
        IGenericRepository<Product> productRepository,
        IGenericRepository<User> userRepository,
        IGenericRepository<Student> studentRepository,
        IGenericRepository<School> schoolRepository,
        ICurrentUserService currentUserService)
    {
        _orderRepository = orderRepository;
        _orderItemRepository = orderItemRepository;
        _cartRepository = cartRepository;
        _productRepository = productRepository;
        _userRepository = userRepository;
        _studentRepository = studentRepository;
        _schoolRepository = schoolRepository;
        _currentUserService = currentUserService;
    }

    private Guid GetCurrentUserId()
    {
        var userIdStr = _currentUserService.UserId;
        if (string.IsNullOrEmpty(userIdStr)) throw new UnauthorizedAccessException("User not logged in.");
        return Guid.Parse(userIdStr);
    }

    public async Task<object> PlaceOrderAsync(PlaceOrderRequest request)
    {
        var userId = GetCurrentUserId();
        var role = _currentUserService.Role?.ToLower();

        // 1. Fetch Cart Items
        var cartItems = await _cartRepository.GetAllAsync(q => q
            .Include(c => c.Product)
            .Where(c => c.UserId == userId && !c.SavedForLater));

        if (!cartItems.Any())
            throw new AppException("Your cart is empty.");

        // 2. Validate Stock
        foreach (var item in cartItems)
        {
            if (item.Product.StockQuantity < item.Quantity || !item.Product.IsAvailable)
                throw new AppException($"Product '{item.Product.Title}' is out of stock or insufficient quantity available.");
        }

        // 3. Resolve student/parent/school mapping
        Guid? studentId = null;
        string studentName = "N/A";
        string parentName = "N/A";
        Guid? schoolId = null;
        string schoolName = "N/A";

        var userObj = await _userRepository.GetByIdAsync(userId);
        if (userObj == null) throw new UnauthorizedAccessException("User not found.");

        if (role == "student")
        {
            var studentList = await _studentRepository.GetAllAsync(q => q
                .Include(s => s.School)
                .Where(s => s.UserId == userId));
            var student = studentList.FirstOrDefault();

            if (student != null)
            {
                studentId = request.StudentId ?? student.Id;
                studentName = !string.IsNullOrEmpty(request.StudentName) ? request.StudentName : $"{student.FirstName} {student.LastName}";
                parentName = !string.IsNullOrEmpty(request.ParentName) ? request.ParentName : (student.ParentGuardianName ?? "N/A");
                schoolId = student.SchoolId;
                schoolName = student.School?.Name ?? "N/A";
            }
        }
        else if (role == "parent")
        {
            parentName = !string.IsNullOrEmpty(request.ParentName) ? request.ParentName : $"{userObj.FirstName} {userObj.LastName}";
            studentName = !string.IsNullOrEmpty(request.StudentName) ? request.StudentName : "N/A";
            
            if (!string.IsNullOrEmpty(userObj.Phone))
            {
                var children = await _studentRepository.GetAllAsync(q => q
                    .Include(s => s.School)
                    .Where(s => s.ParentGuardianPhone != null && s.ParentGuardianPhone.Trim() == userObj.Phone.Trim()));
                var child = children.FirstOrDefault();

                if (child != null)
                {
                    studentId = request.StudentId ?? child.Id;
                    if (string.IsNullOrEmpty(request.StudentName))
                    {
                        studentName = $"{child.FirstName} {child.LastName}";
                    }
                    schoolId = child.SchoolId;
                    schoolName = child.School?.Name ?? "N/A";
                }
            }
        }

        // Fallback for schoolName mapping
        if (schoolId == null && userObj.SchoolId.HasValue)
        {
            schoolId = userObj.SchoolId.Value;
            var school = await _schoolRepository.GetByIdAsync(schoolId.Value);
            schoolName = school?.Name ?? "N/A";
        }

        // 4. Calculate Billing
        decimal subtotal = 0;
        foreach (var item in cartItems)
        {
            var price = item.Product.DiscountPrice ?? item.Product.Price;
            subtotal += price * item.Quantity;
        }

        decimal deliveryCharges = EcommerceConstants.CalculateDeliveryCharges(subtotal);
        decimal totalAmount = subtotal + deliveryCharges;

        // Generate Order Number
        var orderCount = await _orderRepository.CountAsync() + 1;
        var orderNumber = $"ORD-{DateTime.UtcNow:yyyyMMdd}-{orderCount:D4}";

        // 5. Create Order
        var order = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = orderNumber,
            UserId = userId,
            StudentId = studentId,
            StudentName = studentName,
            ParentName = parentName,
            SchoolId = schoolId,
            SchoolName = schoolName,
            ShippingAddress = request.ShippingAddress,
            PinCode = request.PinCode,
            City = request.City,
            State = request.State,
            Country = request.Country,
            ContactNumber = request.ContactNumber,
            AlternateContactNumber = request.AlternateContactNumber,
            OrderNotes = request.OrderNotes,
            Subtotal = subtotal,
            DeliveryCharges = deliveryCharges,
            TotalAmount = totalAmount,
            Status = "Order Placed",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _orderRepository.AddAsync(order);

        // 6. Create Order Items & Deduct Stock
        foreach (var item in cartItems)
        {
            var price = item.Product.DiscountPrice ?? item.Product.Price;
            var orderItem = new OrderItem
            {
                Id = Guid.NewGuid(),
                OrderId = order.Id,
                ProductId = item.ProductId,
                ProductTitle = item.Product.Title,
                ProductSku = item.Product.SkuCode,
                Price = price,
                Quantity = item.Quantity,
                CreatedAt = DateTime.UtcNow
            };
            await _orderItemRepository.AddAsync(orderItem);

            // Stock reduction — re-fetch the product immediately before mutating so we operate
            // on the latest persisted quantity rather than the snapshot loaded at cart-fetch time.
            // This narrows (though, without DB-level row locking, cannot fully eliminate) the
            // race window where two concurrent checkouts could oversell the same product.
            var freshProduct = await _productRepository.GetByIdAsync(item.ProductId) ?? item.Product;
            if (freshProduct.StockQuantity < item.Quantity)
                throw new AppException($"Product '{freshProduct.Title}' no longer has enough stock to fulfil this order.");

            freshProduct.StockQuantity -= item.Quantity;
            if (freshProduct.StockQuantity <= 0)
            {
                freshProduct.StockQuantity = 0;
                freshProduct.IsAvailable = false;
            }
            await _productRepository.UpdateAsync(freshProduct);
        }

        // 7. Clear Shopping Cart
        foreach (var item in cartItems)
        {
            await _cartRepository.DeleteAsync(item);
        }

        return new
        {
            message = "Order placed successfully.",
            orderId = order.Id,
            orderNumber = order.OrderNumber
        };
    }

    public async Task<List<object>> GetMyOrdersAsync()
    {
        var userId = GetCurrentUserId();
        var orders = await _orderRepository.GetAllAsync(q => q
            .Include(o => o.OrderItems)
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAt));

        return orders.Select(o => (object)new
        {
            o.Id,
            o.OrderNumber,
            o.CreatedAt,
            o.TotalAmount,
            o.Status,
            o.SchoolName,
            ItemsCount = o.OrderItems.Sum(oi => oi.Quantity)
        }).ToList();
    }

    public async Task<object> GetByIdAsync(Guid id)
    {
        var role = _currentUserService.Role?.ToLower();
        var orders = await _orderRepository.GetAllAsync(q => q
            .Include(o => o.OrderItems)
            .ThenInclude(oi => oi.Product)
            .Where(o => o.Id == id));
        var order = orders.FirstOrDefault();

        if (order == null) throw new AppException("Order not found.");

        if (role == "student" || role == "parent")
        {
            var userId = GetCurrentUserId();
            if (order.UserId != userId) throw new UnauthorizedAccessException("Access denied to this order.");
        }

        return new
        {
            id = order.Id,
            order_number = order.OrderNumber,
            student_name = order.StudentName,
            parent_name = order.ParentName,
            school_name = order.SchoolName,
            shipping_address = order.ShippingAddress,
            pin_code = order.PinCode,
            city = order.City,
            state = order.State,
            country = order.Country,
            contact_number = order.ContactNumber,
            alternate_contact_number = order.AlternateContactNumber,
            order_notes = order.OrderNotes,
            subtotal = order.Subtotal,
            delivery_charges = order.DeliveryCharges,
            total_amount = order.TotalAmount,
            status = order.Status,
            delivery_notes = order.DeliveryNotes,
            estimated_delivery_date = order.EstimatedDeliveryDate,
            created_at = order.CreatedAt,
            updated_at = order.UpdatedAt,
            order_items = order.OrderItems.Select(oi => new
            {
                id = oi.Id,
                product_id = oi.ProductId,
                product_title = oi.ProductTitle,
                product_sku = oi.ProductSku,
                price = oi.Price,
                quantity = oi.Quantity
            }).ToList()
        };
    }

    public async Task<object> GetOrderTrackingAsync(Guid id)
    {
        var order = await _orderRepository.GetByIdAsync(id);
        if (order == null) throw new AppException("Order not found.");

        var role = _currentUserService.Role?.ToLower();
        if ((role == "student" || role == "parent") && order.UserId != GetCurrentUserId())
        {
            throw new UnauthorizedAccessException("Access denied.");
        }

        var statuses = new List<string> { "Order Placed", "Confirmed", "Packed", "Out for Delivery", "Delivered" };
        var currentIndex = statuses.IndexOf(order.Status);
        if (order.Status == "Cancelled") currentIndex = -1;

        var timeline = statuses.Select((s, index) => new
        {
            Status = s,
            IsCompleted = index <= currentIndex,
            IsCurrent = index == currentIndex,
            Date = index == 0 ? order.CreatedAt 
                 : index == currentIndex ? order.UpdatedAt 
                 : (DateTime?)null,
            Notes = index == currentIndex ? order.DeliveryNotes : null
        }).ToList();

        return new
        {
            order.Id,
            order.OrderNumber,
            order.Status,
            order.DeliveryNotes,
            order.EstimatedDeliveryDate,
            timeline,
            isCancelled = order.Status == "Cancelled"
        };
    }

    public async Task ReorderAsync(Guid id)
    {
        var userId = GetCurrentUserId();
        var orders = await _orderRepository.GetAllAsync(q => q
            .Include(o => o.OrderItems)
            .Where(o => o.Id == id && o.UserId == userId));
        var order = orders.FirstOrDefault();

        if (order == null) throw new AppException("Order not found.");

        foreach (var item in order.OrderItems)
        {
            var product = await _productRepository.GetByIdAsync(item.ProductId);
            if (product != null && product.IsVisible && product.StockQuantity > 0)
            {
                var existingCarts = await _cartRepository.GetAllAsync(q => q
                    .Where(c => c.UserId == userId && c.ProductId == product.Id));
                var cartItem = existingCarts.FirstOrDefault();

                if (cartItem != null)
                {
                    cartItem.Quantity = Math.Min(cartItem.Quantity + item.Quantity, product.StockQuantity);
                    await _cartRepository.UpdateAsync(cartItem);
                }
                else
                {
                    var newCart = new CartItem
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        ProductId = product.Id,
                        Quantity = Math.Min(item.Quantity, product.StockQuantity),
                        SavedForLater = false,
                        CreatedAt = DateTime.UtcNow
                    };
                    await _cartRepository.AddAsync(newCart);
                }
            }
        }
    }

    public async Task<List<object>> GetAdminOrdersAsync(string? search, Guid? schoolId, string? status, DateTime? date)
    {
        var orders = await _orderRepository.GetAllAsync(q =>
        {
            var query = q.Include(o => o.OrderItems).AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower().Trim();
                query = query.Where(o => o.OrderNumber.ToLower().Contains(searchLower)
                    || o.StudentName.ToLower().Contains(searchLower)
                    || o.ParentName.ToLower().Contains(searchLower)
                    || o.SchoolName.ToLower().Contains(searchLower));
            }

            if (schoolId.HasValue)
            {
                query = query.Where(o => o.SchoolId == schoolId.Value);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(o => o.Status == status);
            }

            if (date.HasValue)
            {
                var localDate = date.Value.Date;
                query = query.Where(o => o.CreatedAt.Date == localDate);
            }

            return query.OrderByDescending(o => o.CreatedAt);
        });

        return orders.Select(o => (object)new
        {
            o.Id,
            o.OrderNumber,
            o.StudentName,
            o.ParentName,
            o.SchoolName,
            o.TotalAmount,
            o.Status,
            o.CreatedAt,
            ItemsCount = o.OrderItems.Sum(oi => oi.Quantity)
        }).ToList();
    }

    public async Task<object> UpdateOrderStatusAsync(Guid id, UpdateStatusRequest request)
    {
        var order = await _orderRepository.GetByIdAsync(id);
        if (order == null) throw new AppException("Order not found.");

        var validStatuses = new[] { "Order Placed", "Confirmed", "Packed", "Out for Delivery", "Delivered", "Cancelled" };
        if (!validStatuses.Contains(request.Status))
            throw new AppException("Invalid status value.");

        if (request.Status == "Cancelled" && order.Status != "Cancelled")
        {
            var orderItems = await _orderItemRepository.GetAllAsync(q => q.Where(oi => oi.OrderId == id));
            foreach (var item in orderItems)
            {
                var product = await _productRepository.GetByIdAsync(item.ProductId);
                if (product != null)
                {
                    product.StockQuantity += item.Quantity;
                    product.IsAvailable = true;
                    await _productRepository.UpdateAsync(product);
                }
            }
        }

        order.Status = request.Status;
        order.DeliveryNotes = request.DeliveryNotes;
        if (request.EstimatedDeliveryDate.HasValue)
        {
            order.EstimatedDeliveryDate = request.EstimatedDeliveryDate.Value;
        }
        order.UpdatedAt = DateTime.UtcNow;

        await _orderRepository.UpdateAsync(order);

        return new { message = "Order status updated successfully.", status = order.Status };
    }

    public async Task<object> GetInvoiceAsync(Guid id)
    {
        var orders = await _orderRepository.GetAllAsync(q => q
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.Product)
            .Where(o => o.Id == id));
        var order = orders.FirstOrDefault();

        if (order == null) throw new AppException("Order not found.");

        var role = _currentUserService.Role?.ToLower();
        if ((role == "student" || role == "parent") && order.UserId != GetCurrentUserId())
        {
            throw new UnauthorizedAccessException("Access denied.");
        }

        // Start with stored values; enrich from live DB when stored as "N/A" or blank
        string resolvedStudentName = order.StudentName ?? "";
        string resolvedParentName = order.ParentName ?? "";
        string resolvedSchoolName = order.SchoolName ?? "";
        string studentEmail = "";
        string studentPhone = "";
        string parentPhone = "";
        string parentEmail = "";
        string gradeName = "";

        // Attempt enrichment via StudentId (most precise)
        Guid? lookupStudentId = order.StudentId;

        // If no StudentId, check if the ordering user IS a student
        if (lookupStudentId == null)
        {
            var orderingUser = await _userRepository.GetByIdAsync(order.UserId);
            if (orderingUser != null && (role == "student" ||
                orderingUser.RoleId != Guid.Empty /* always try */))
            {
                var byUser = await _studentRepository.GetAllAsync(q => q
                    .Where(s => s.UserId == order.UserId));
                lookupStudentId = byUser.FirstOrDefault()?.Id;
            }
        }

        if (lookupStudentId.HasValue)
        {
            var students = await _studentRepository.GetAllAsync(q => q
                .Include(s => s.School)
                .Include(s => s.Grade)
                .Where(s => s.Id == lookupStudentId.Value));
            var student = students.FirstOrDefault();

            if (student != null)
            {
                if (string.IsNullOrEmpty(resolvedStudentName) || resolvedStudentName == "N/A")
                    resolvedStudentName = $"{student.FirstName} {student.LastName}".Trim();
                if (string.IsNullOrEmpty(resolvedParentName) || resolvedParentName == "N/A")
                    resolvedParentName = student.ParentGuardianName ?? "";
                if (string.IsNullOrEmpty(resolvedSchoolName) || resolvedSchoolName == "N/A")
                    resolvedSchoolName = student.School?.Name ?? "";

                studentEmail = student.Email ?? "";
                studentPhone = student.Phone ?? "";
                parentPhone = student.ParentGuardianPhone ?? "";
                parentEmail = student.ParentGuardianEmail ?? "";
                gradeName = student.Grade?.GradeName ?? "";
            }
        }

        // Final fallback: resolve school from SchoolId if still blank
        if ((string.IsNullOrEmpty(resolvedSchoolName) || resolvedSchoolName == "N/A") && order.SchoolId.HasValue)
        {
            var school = await _schoolRepository.GetByIdAsync(order.SchoolId.Value);
            resolvedSchoolName = school?.Name ?? "";
        }

        // Ensure CreatedAt is emitted as UTC so JS `new Date(...)` never gives Invalid Date
        var orderDate = order.CreatedAt == default
            ? DateTime.UtcNow
            : DateTime.SpecifyKind(order.CreatedAt, DateTimeKind.Utc);

        return new
        {
            companyName = "NUBEERA Tech STEM Marketplace",
            companyAddress = "STEM Learning Innovation Center, Tech Park",
            companyContact = "support@nubeera.tech",
            invoiceNumber = !string.IsNullOrEmpty(order.OrderNumber)
                ? order.OrderNumber.Replace("ORD-", "INV-")
                : $"INV-{order.Id.ToString().Substring(0, 8).ToUpper()}",
            orderNumber = !string.IsNullOrEmpty(order.OrderNumber)
                ? order.OrderNumber
                : $"ORD-{order.Id.ToString().Substring(0, 8).ToUpper()}",
            orderDate,
            orderStatus = order.Status ?? "N/A",
            studentName = string.IsNullOrEmpty(resolvedStudentName) || resolvedStudentName == "N/A" ? "N/A" : resolvedStudentName,
            parentName = string.IsNullOrEmpty(resolvedParentName) || resolvedParentName == "N/A" ? "N/A" : resolvedParentName,
            schoolName = string.IsNullOrEmpty(resolvedSchoolName) || resolvedSchoolName == "N/A" ? "N/A" : resolvedSchoolName,
            studentEmail,
            studentPhone,
            parentPhone,
            parentEmail,
            gradeName,
            shippingAddress = !string.IsNullOrEmpty(order.ShippingAddress)
                ? $"{order.ShippingAddress}, {order.City}, {order.State} - {order.PinCode}, {order.Country}"
                : "N/A",
            contactNumber = order.ContactNumber ?? "N/A",
            alternateContact = order.AlternateContactNumber ?? "",
            paymentMethod = "Cash on Delivery (COD) / Manual Collection",
            paymentStatus = order.Status == "Delivered" ? "Paid" : "Pending",
            items = order.OrderItems.Select(oi => new {
                title = !string.IsNullOrEmpty(oi.ProductTitle) ? oi.ProductTitle : (oi.Product?.Title ?? "N/A"),
                sku = !string.IsNullOrEmpty(oi.ProductSku) ? oi.ProductSku : (oi.Product?.SkuCode ?? "N/A"),
                price = oi.Price,
                qty = oi.Quantity,
                total = oi.Price * oi.Quantity,
                imageUrl = oi.Product?.ThumbnailUrl ?? ""
            }).ToList(),
            subtotal = order.Subtotal,
            shipping = order.DeliveryCharges,
            total = order.TotalAmount
        };
    }
}
