using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NubeEra.Infrastructure.Persistence.DbContext;

#nullable disable

namespace NubeEra.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260614101000_AddMissingLessonActivityColumns")]
    partial class AddMissingLessonActivityColumns
    {
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
        }
    }
}
