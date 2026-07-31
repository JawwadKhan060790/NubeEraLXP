using Veriton.API.Middleware;

namespace Veriton.API.Extensions;

/// <summary>
/// Registers the application's custom middleware pipeline in a single call.
/// Invoke <see cref="UseVeritonMiddleware"/> in <c>Program.cs</c> after
/// <c>UseRouting</c> and before <c>MapControllers</c>.
/// </summary>
public static class MiddlewareExtensions
{
    public static WebApplication UseVeritonMiddleware(this WebApplication app)
    {
        app.UseMiddleware<ExceptionHandlingMiddleware>();
        return app;
    }
}
