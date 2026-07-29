namespace NubeEra.Domain.Common;

/// <summary>
/// Shared business constants for the STEM Equipment Hub e-commerce module.
/// Centralised here — rather than duplicated as magic numbers across CartService and
/// OrderService — so the cart summary shown to the shopper always matches the totals
/// persisted on the order at checkout (previously these two services each carried their
/// own slightly different copy of the free-delivery threshold/fee).
/// </summary>
public static class EcommerceConstants
{
    /// <summary>Order subtotal (in store currency) at or above which delivery is free.</summary>
    public const decimal FreeDeliveryThreshold = 500m;

    /// <summary>Flat delivery fee charged when the subtotal is below <see cref="FreeDeliveryThreshold"/>.</summary>
    public const decimal StandardDeliveryFee = 50m;

    /// <summary>Low-stock threshold used to flag products needing restock across admin views.</summary>
    public const int LowStockThreshold = 5;

    /// <summary>
    /// Computes delivery charges for a given order/cart subtotal using the single shared rule:
    /// free delivery at or above <see cref="FreeDeliveryThreshold"/> (and for an empty cart),
    /// otherwise a flat <see cref="StandardDeliveryFee"/>.
    /// </summary>
    public static decimal CalculateDeliveryCharges(decimal subtotal)
    {
        if (subtotal <= 0 || subtotal >= FreeDeliveryThreshold)
            return 0m;

        return StandardDeliveryFee;
    }
}
