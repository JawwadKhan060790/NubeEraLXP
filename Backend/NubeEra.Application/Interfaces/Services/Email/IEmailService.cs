using System.Threading.Tasks;

namespace NubeEra.Application.Interfaces.Services.Email;

/// <summary>
/// Out-of-band email delivery abstraction.
///
/// Added to close the QA-documented gap "Email/SMS delivery channel for critical
/// notifications": previously, time-sensitive communications (password-reset OTPs,
/// event cancellations, etc.) existed only as in-app notifications polled every
/// 30 seconds, so a logged-out or inactive user received nothing until their next
/// session. Implementations of this interface provide a real, out-of-band channel.
///
/// Callers should treat email delivery as best-effort: a delivery failure must never
/// prevent the primary action (e.g., issuing a password-reset OTP) from succeeding.
/// Implementations should log failures rather than throw, and callers that want to
/// know whether the message actually went out can inspect the returned bool.
/// </summary>
public interface IEmailService
{
    /// <summary>
    /// Sends a plain-text (or simple HTML) email. Returns true if the message was
    /// handed off to a delivery channel successfully, false if delivery could not be
    /// attempted/completed (in which case the failure has already been logged).
    /// </summary>
    Task<bool> SendAsync(string toAddress, string subject, string body, bool isHtml = false);
}
