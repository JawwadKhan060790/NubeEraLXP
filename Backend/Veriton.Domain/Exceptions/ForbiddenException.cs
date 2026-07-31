namespace Veriton.Domain.Exceptions;

/// <summary>
/// Thrown when an authenticated user lacks permission to perform an action.
/// Maps to HTTP 403 Forbidden in the global exception handler.
/// </summary>
public sealed class ForbiddenException : Exception
{
    public ForbiddenException(string message = "You do not have permission to perform this action.")
        : base(message) { }

    public ForbiddenException(string action, string resource)
        : base($"You do not have permission to {action} '{resource}'.") { }
}
