using System.Threading.Tasks;

namespace Veriton.Application.Interfaces.Services.Sms;

/// <summary>
/// Out-of-band SMS delivery abstraction — the second half of closing the QA-documented
/// gap "Email/SMS delivery channel for critical notifications".
///
/// No SMS provider account/credentials are available in this engagement, so the
/// registered implementation (see Veriton.Infrastructure.Services.Sms.ConsoleSmsService)
/// is a logging stub that mirrors the existing "[MAIL SIMULATION]" console pattern
/// already used by AuthController.ForgotPassword. It defines the seam a real provider
/// (Twilio, Vonage, a regional gateway, etc.) can be dropped into via DI without any
/// caller-side changes — register the new implementation in
/// Veriton.Infrastructure/DependencyInjection.cs in place of ConsoleSmsService and add
/// its credentials to configuration, following the same pattern as the "Smtp" section.
/// </summary>
public interface ISmsService
{
    /// <summary>
    /// Sends a short text message to the given phone number. Returns true if the
    /// message was handed off to a delivery channel successfully, false otherwise
    /// (failures are logged by the implementation, never thrown to the caller).
    /// </summary>
    Task<bool> SendAsync(string toPhoneNumber, string message);
}
