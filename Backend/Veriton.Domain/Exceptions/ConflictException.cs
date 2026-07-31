namespace Veriton.Domain.Exceptions;

/// <summary>
/// Thrown when an operation would create a duplicate or conflicting record.
/// Maps to HTTP 409 Conflict in the global exception handler.
/// </summary>
public sealed class ConflictException : Exception
{
    public ConflictException(string message)
        : base(message) { }

    public ConflictException(string entityName, string field, object value)
        : base($"{entityName} with {field} '{value}' already exists.") { }
}
