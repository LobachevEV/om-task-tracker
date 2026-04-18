using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OneMoreTaskTracker.Users.Migrations
{
    /// <inheritdoc />
    public partial class SplitDeveloperRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "UPDATE users.\"Users\" SET \"Role\" = 'FrontendDeveloper' WHERE \"Role\" = 'Developer';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "UPDATE users.\"Users\" SET \"Role\" = 'Developer' WHERE \"Role\" IN ('FrontendDeveloper', 'BackendDeveloper', 'Qa');");
        }
    }
}
