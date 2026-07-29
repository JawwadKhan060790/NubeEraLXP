using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Threading.Tasks;
using NubeEra.Application.Common.Responses;

namespace NubeEra.API.Filters;

public class ApiResponseFilter : IAsyncResultFilter
{
    public async Task OnResultExecutionAsync(ResultExecutingContext context, ResultExecutionDelegate next)
    {
        var path = context.HttpContext.Request.Path.Value?.ToLower();
        if (path != null && (path.Contains("/swagger") || path.Contains("/health")))
        {
            await next();
            return;
        }

        if (context.Result is ObjectResult objectResult)
        {
            var valueType = objectResult.Value?.GetType();
            bool isAlreadyWrapped = false;
            
            if (valueType != null)
            {
                isAlreadyWrapped = valueType.IsGenericType && 
                                   valueType.GetGenericTypeDefinition() == typeof(ApiResponse<>);
            }

            if (!isAlreadyWrapped)
            {
                var statusCode = objectResult.StatusCode ?? context.HttpContext.Response.StatusCode;
                var success = statusCode >= 200 && statusCode < 300;

                var wrappedResult = new ApiResponse<object>
                {
                    Success = success,
                    Message = success ? "Request processed successfully." : "An error occurred.",
                    Data = objectResult.Value,
                    StatusCode = statusCode
                };

                if (!success)
                {
                    if (objectResult.Value is ValidationProblemDetails problemDetails)
                    {
                        foreach (var error in problemDetails.Errors)
                        {
                            foreach (var message in error.Value)
                            {
                                wrappedResult.Errors.Add($"{error.Key}: {message}");
                            }
                        }
                        wrappedResult.Message = "Validation failed.";
                    }
                    else if (objectResult.Value is SerializableError serializableError)
                    {
                        foreach (var error in serializableError)
                        {
                            if (error.Value is string[] errorMessages)
                            {
                                foreach (var msg in errorMessages)
                                {
                                    wrappedResult.Errors.Add($"{error.Key}: {msg}");
                                }
                            }
                        }
                        wrappedResult.Message = "Validation failed.";
                    }
                    else if (objectResult.Value is string stringMsg)
                    {
                        wrappedResult.Errors.Add(stringMsg);
                        wrappedResult.Data = null;
                    }
                }

                objectResult.Value = wrappedResult;
            }
        }
        else if (context.Result is StatusCodeResult statusCodeResult)
        {
            var statusCode = statusCodeResult.StatusCode;
            var success = statusCode >= 200 && statusCode < 300;
            
            var wrappedResult = new ApiResponse<object>
            {
                Success = success,
                Message = success ? "Request processed successfully." : "Request failed.",
                StatusCode = statusCode,
                Data = null
            };

            context.Result = new ObjectResult(wrappedResult)
            {
                StatusCode = statusCode
            };
        }
        else if (context.Result is EmptyResult || context.Result is NoContentResult)
        {
            var statusCode = context.HttpContext.Response.StatusCode;
            var wrappedResult = new ApiResponse<object>
            {
                Success = true,
                Message = "Request processed successfully.",
                StatusCode = statusCode,
                Data = null
            };

            context.Result = new ObjectResult(wrappedResult)
            {
                StatusCode = statusCode
            };
        }

        await next();
    }
}
