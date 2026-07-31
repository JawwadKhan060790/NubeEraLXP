using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Veriton.Application.Interfaces.Services.Sms;

namespace Veriton.Infrastructure.Services.Sms;

/// <summary>
/// Logging-stub implementation of ISmsService.
///
/// No SMS gateway account/credentials are available in this engagement (Twilio,
/// Vonage, regional aggregators, etc. all require external account setup that is
/// outside the scope of a code-level fix). This implementation defines the delivery
/// seam and mirrors the existing "[MAIL SIMULATION]" console-logging convention
/// (see the prior AuthController.ForgotPassword behavior and SmtpEmailService's
/// fallback path), so the rest of the system can be wired to ISmsService today.
///
/// To go to production with real SMS delivery: implement ISmsService against the
/// chosen provider's SDK/HTTP API, add its credentials under a new configuration
/// section (following the "Smtp" section's pattern), and swap the registration in
/// Veriton.Infrastructure/DependencyInjection.cs from ConsoleSmsService to the new
/// implementation — no caller-side changes are required.
/// </summary>
public class ConsoleSmsService : ISmsService
{
    private readonly ILogger<ConsoleSmsService> _logger;

    public ConsoleSmsService(ILogger<ConsoleSmsService> logger)
    {
        _logger = logger;
    }

    public Task<bool> SendAsync(string toPhoneNumber, string message)
    {
        if (string.IsNullOrWhiteSpace(toPhoneNumber))
        {
            _logger.LogWarning("ConsoleSmsService.SendAsync called with an empty recipient phone number");
            return Task.FromResult(false);
        }

        Console.WriteLine($"\n[SMS SIMULATION — no SMS provider configured] To: {toPhoneNumber}\n{message}\n");
        _logger.LogInformation("SMS simulated (no provider configured) to {ToPhoneNumber}", toPhoneNumber);
        return Task.FromResult(true);
    }
}
