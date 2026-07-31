using Veriton.Application.DTOs;

namespace Veriton.Application.Interfaces.Services.Certificates;

public interface ICertificatePdfService
{
    /// <summary>
    /// Generates a professional A4 PDF for the given certificate and returns the byte array.
    /// The logo is embedded from the server-side logo file.
    /// </summary>
    Task<byte[]> GeneratePdfAsync(CertificateDto certificate, string logoPath);

    /// <summary>
    /// Generates a base64-encoded QR code PNG for the certificate verification URL.
    /// </summary>
    string GenerateQrCodeBase64(string verificationUrl);
}
