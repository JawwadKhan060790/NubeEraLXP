using System;

namespace Veriton.Domain.Common;

public class AppException : Exception
{
    public AppException(string message) : base(message) { }
}
