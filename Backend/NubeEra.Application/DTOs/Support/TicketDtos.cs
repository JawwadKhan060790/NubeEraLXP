using System;
using System.Collections.Generic;
using NubeEra.Domain.Entities;

namespace NubeEra.Application.DTOs;

public class CreateCategoryDto
{
    public string Name { get; set; } = null!;
    public string Description { get; set; } = string.Empty;
}

public class CreateAttachmentDto
{
    public string FileName { get; set; } = null!;
    public string FileUrl { get; set; } = null!;
    public string FileType { get; set; } = null!;
    public long FileSize { get; set; }
}

public class CreateTicketDto
{
    public string Subject { get; set; } = null!;
    public string Description { get; set; } = null!;
    public TicketPriority Priority { get; set; } = TicketPriority.Medium;
    public Guid CategoryId { get; set; }
    public List<CreateAttachmentDto> Attachments { get; set; } = new();
}

public class CreateCommentDto
{
    public string Content { get; set; } = null!;
    public bool IsInternal { get; set; } = false;
    public List<CreateAttachmentDto> Attachments { get; set; } = new();
}

public class AssignTicketDto
{
    public Guid AssignedToUserId { get; set; }
}

public class UpdateTicketStatusDto
{
    public TicketStatus Status { get; set; }
}
