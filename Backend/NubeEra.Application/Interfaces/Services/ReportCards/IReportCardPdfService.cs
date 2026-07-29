using NubeEra.Application.DTOs;

namespace NubeEra.Application.Interfaces.Services.ReportCards;

public interface IReportCardPdfService
{
    /// <summary>Generates a professional A4 PDF for the given report card and returns its bytes.</summary>
    byte[] GeneratePdf(ReportCardDto reportCard);

    /// <summary>Returns a base64-encoded PNG QR code pointing to the verification URL.</summary>
    string GenerateQrCodeBase64(string verificationUrl);
}
