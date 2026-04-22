using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OneMoreTaskTracker.Features.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "features");

            migrationBuilder.CreateTable(
                name: "Features",
                schema: "features",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    State = table.Column<int>(type: "integer", nullable: false),
                    PlannedStart = table.Column<DateOnly>(type: "date", nullable: true),
                    PlannedEnd = table.Column<DateOnly>(type: "date", nullable: true),
                    LeadUserId = table.Column<int>(type: "integer", nullable: false),
                    ManagerUserId = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Features", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Features_LeadUserId",
                schema: "features",
                table: "Features",
                column: "LeadUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Features_ManagerUserId",
                schema: "features",
                table: "Features",
                column: "ManagerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Features_State",
                schema: "features",
                table: "Features",
                column: "State");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Features",
                schema: "features");
        }
    }
}
