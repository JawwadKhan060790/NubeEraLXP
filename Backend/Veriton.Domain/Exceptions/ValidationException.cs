namespace Veriton.Domain.Exceptions;

/// <summary>
/// Thrown when domain-level business rule validation fails.
/// Carries a dictionary of field → error messages for structured error responses.
/// Maps to HTTP 422 Unprocessable Entity in the global exception handler.
/// </summary>
public sealed class DomainValidationException : Exception
{
    /// <summary>Field-level validation failures. Key = property name, Value = list of errors.</summary>
    public IReadOnlyDictionary<string, string[]> Errors { get; }

    public DomainValidationException(string message)
        : base(message)
    {
        Errors = new Dictionary<string, string[]>();
    }

    public DomainValidationException(string field, string error)
        : base($"Validation failed for '{field}': {error}")
    {
        Errors = new Dictionary<string, string[]>
        {
            [field] = new[] { error }
        };
    }

    public DomainValidationException(IDictionary<string, string[]> errors)
        : base("One or more validation errors occurred.")
    {
        Errors = new Dictionary<string, string[]>(errors);
    }
}
