using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NubeEra.Application.Interfaces.Services.Email;

namespace NubeEra.Infrastructure.Services.Email;

/// <summary>
/// SMTP-backed implementation of IEmailService using the built-in System.Net.Mail
/// client (no extra NuGet dependency required).
///
/// Configuration lives under the "Smtp" section in appsettings (Host, Port, Username,
/// Password, FromAddress, FromName, EnableSsl). If "Smtp:Host" is not configured —
/// e.g. in local/dev environments without mail-server credentials — this service
/// degrades gracefully to the same console-logging behavior AuthController.ForgotPassword
/// already used ("[MAIL SIMULATION]"), so existing flows keep working unchanged until
/// real SMTP credentials are supplied via configuration/environment/secrets.
/// </summary>
public class SmtpEmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(IConfiguration configuration, ILogger<SmtpEmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<bool> SendAsync(string toAddress, string subject, string body, bool isHtml = false)
    {
        if (string.IsNullOrWhiteSpace(toAddress))
        {
            _logger.LogWarning("SmtpEmailService.SendAsync called with an empty recipient address; subject=\"{Subject}\"", subject);
            return false;
        }

        var host = _configuration["Smtp:Host"];
        if (string.IsNullOrWhiteSpace(host))
        {
            // No SMTP server configured — fall back to console simulation so the
            // calling flow (e.g. password-reset OTP) still "delivers" something
            // observable in dev/test environments, exactly like the prior behavior.
            Console.WriteLine($"\n[EMAIL SIMULATION — Smtp:Host not configured] To: {toAddress} | Subject: {subject}\n{body}\n");
            return true;
        }

        try
        {
            var port = int.TryParse(_configuration["Smtp:Port"], out var p) ? p : 587;
            var enableSsl = !bool.TryParse(_configuration["Smtp:EnableSsl"], out var ssl) || ssl; // default true
            var fromAddress = _configuration["Smtp:FromAddress"] ?? _configuration["Smtp:Username"] ?? "no-reply@veriton-lms.local";
            var fromName = _configuration["Smtp:FromName"] ?? "NubeEra LMS";
            var username = _configuration["Smtp:Username"];
            var password = _configuration["Smtp:Password"];

            using var client = new SmtpClient(host, port) { EnableSsl = enableSsl };
            if (!string.IsNullOrEmpty(username))
            {
                client.Credentials = new NetworkCredential(username, password);
            }

            using var message = new MailMessage
            {
                From = new MailAddress(fromAddress, fromName),
                Subject = subject,
                Body = body,
                IsBodyHtml = isHtml
            };
            message.To.Add(toAddress);

            await client.SendMailAsync(message);
            _logger.LogInformation("Email sent to {ToAddress} (subject=\"{Subject}\") via SMTP host {Host}", toAddress, subject, host);
            return true;
        }
        catch (Exception ex)
        {
            // Email delivery is best-effort and must never block the primary action
            // (e.g. issuing a password-reset OTP must still succeed even if the email
            // bounces) — log and report failure rather than throwing.
            _logger.LogError(ex, "Failed to send email to {ToAddress} (subject=\"{Subject}\") via SMTP host {Host}", toAddress, subject, host);
            return false;
        }
    }
}
