namespace Veriton.Domain.Common;

public interface IMultiTenant
{
    Guid SchoolId { get; set; }
}

public interface IOwnedByTeacher
{
    Guid TeacherId { get; set; }
}

public interface IOwnedByStudent
{
    Guid StudentId { get; set; }
}
