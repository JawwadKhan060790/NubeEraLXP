using System.Text.Json;
using NubeEra.Application.Common.Responses;
using NubeEra.Domain.Common;
using NubeEra.Domain.Exceptions;

namespace NubeEra.API.Middleware;

/// <summary>
/// Global exception handler.  Catches every unhandled exception from the pipeline
/// and maps it to a structured <see cref="ApiResponse{T}"/> with the correct HTTP
/// status code so no controller needs its own try/catch.
///
/// Handled exception types:
///   <see cref="NotFoundException"/>          → 404
///   <see cref="ForbiddenException"/>          → 403
///   <see cref="GradeAccessForbiddenException"/> → 403
///   <see cref="ConflictException"/>           → 409
///   <see cref="DomainValidationException"/>   → 422
///   <see cref="UnauthorizedAccessException"/> → 401
///   <see cref="AppException"/>                → 400
///   FluentValidation.ValidationException      → 422
///   Everything else                           → 500
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next   = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception on {Method} {Path}",
                context.Request.Method, context.Request.Path);
            await HandleExceptionAsync(context, ex);
        }
    }

    // ── Exception → HTTP mapping ─────────────────────────────────────────────

    private static Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, message, errors) = ex switch
        {
            NotFoundException nfe   => (StatusCodes.Status404NotFound,          nfe.Message,                                  NoErrors()),
            ForbiddenException fe   => (StatusCodes.Status403Forbidden,          fe.Message,                                   NoErrors()),
            GradeAccessForbiddenException gfe => (StatusCodes.Status403Forbidden, gfe.Message,                                NoErrors()),
            ConflictException ce    => (StatusCodes.Status409Conflict,           ce.Message,                                   NoErrors()),
            DomainValidationException dve => (StatusCodes.Status422UnprocessableEntity, "Validation failed.",
                                               FlattenValidationErrors(dve.Errors)),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized,   "Unauthorized access.",                       NoErrors()),
            AppException ape        => (StatusCodes.Status400BadRequest,         ape.Message,                                  NoErrors()),
            _ when IsFluentValidationException(ex) => (StatusCodes.Status422UnprocessableEntity, "Validation failed.",
                                               ExtractFluentErrors(ex)),
            _                       => (StatusCodes.Status500InternalServerError, "An internal server error occurred.",        NoErrors())
        };

        context.Response.StatusCode = statusCode;

        var response = new ApiResponse<object>
        {
            Success    = false,
            Message    = message,
            Errors     = errors,
            StatusCode = statusCode,
            Data       = null
        };

        return context.Response.WriteAsync(
            JsonSerializer.Serialize(response, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
            }));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static List<string> NoErrors() => [];

    private static List<string> FlattenValidationErrors(
        IReadOnlyDictionary<string, string[]> errors)
        => errors.SelectMany(kv => kv.Value.Select(msg => $"{kv.Key}: {msg}")).ToList();

    private static bool IsFluentValidationException(Exception ex)
        => ex.GetType().Name == "ValidationException";

    private static List<string> ExtractFluentErrors(Exception ex)
    {
        try
        {
            var errorsProp = ex.GetType().GetProperty("Errors");
            if (errorsProp?.GetValue(ex) is System.Collections.IEnumerable validationErrors)
            {
                var result = new List<string>();
                foreach (var err in validationErrors)
                {
                    var msg  = err.GetType().GetProperty("ErrorMessage")?.GetValue(err)?.ToString() ?? string.Empty;
                    var prop = err.GetType().GetProperty("PropertyName")?.GetValue(err)?.ToString();
                    result.Add(string.IsNullOrEmpty(prop) ? msg : $"{prop}: {msg}");
                }
                return result;
            }
        }
        catch { /* fall through */ }

        return [ex.Message];
    }
}
