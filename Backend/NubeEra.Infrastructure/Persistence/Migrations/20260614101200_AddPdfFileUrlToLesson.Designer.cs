using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NubeEra.Infrastructure.Persistence.DbContext;

#nullable disable

namespace NubeEra.Infrastructure.Persistence.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260614101200_AddPdfFileUrlToLesson")]
    partial class AddPdfFileUrlToLesson
    {
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
        }
    }
}
