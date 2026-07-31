using Microsoft.OpenApi.Models;

namespace Veriton.API.Extensions;

/// <summary>Registers Swagger/OpenAPI with Bearer token support.</summary>
public static class SwaggerExtensions
{
    public static IServiceCollection AddSwaggerWithJwt(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo
            {
                Title   = "Veriton LMS API",
                Version = "v1",
                Description = "Enterprise Learning Management System — Veriton"
            });

            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Description  = "JWT authorization. Enter: **Bearer {token}**",
                Name         = "Authorization",
                In           = ParameterLocation.Header,
                Type         = SecuritySchemeType.Http,
                Scheme       = "bearer",
                BearerFormat = "JWT"
            });

            options.AddSecurityRequirement(new OpenApiSecurityRequirement
            {
                {
                    new OpenApiSecurityScheme
                    {
                        Reference = new OpenApiReference
                        {
                            Type = ReferenceType.SecurityScheme,
                            Id   = "Bearer"
                        }
                    },
                    Array.Empty<string>()
                }
            });
        });

        return services;
    }

    /// <summary>Enables Swagger UI on all environments (gate with env check in Program.cs if needed).</summary>
    public static WebApplication UseSwaggerUI(this WebApplication app)
    {
        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "Veriton API v1");
            c.RoutePrefix = "swagger";
        });
        return app;
    }
}
