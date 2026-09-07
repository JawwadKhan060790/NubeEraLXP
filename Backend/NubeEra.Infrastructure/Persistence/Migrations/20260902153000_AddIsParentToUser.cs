using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NubeEra.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddIsParentToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsParent",
                table: "users",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql(@"
                UPDATE users 
                SET IsParent = 1 
                WHERE RoleId IN (SELECT Id FROM roles WHERE RoleName = 'Parent')
                   OR Phone IN (SELECT DISTINCT ParentGuardianPhone FROM students WHERE ParentGuardianPhone IS NOT NULL AND ParentGuardianPhone != '')
                   OR Email IN (SELECT DISTINCT ParentGuardianEmail FROM students WHERE ParentGuardianEmail IS NOT NULL AND ParentGuardianEmail != '');
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsParent",
                table: "users");
        }
    }
}
