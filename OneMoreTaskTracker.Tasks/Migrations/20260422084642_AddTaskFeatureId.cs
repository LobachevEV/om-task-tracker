using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OneMoreTaskTracker.Tasks.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskFeatureId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FeatureId",
                schema: "tasks",
                table: "Tasks",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_FeatureId",
                schema: "tasks",
                table: "Tasks",
                column: "FeatureId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tasks_FeatureId",
                schema: "tasks",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "FeatureId",
                schema: "tasks",
                table: "Tasks");
        }
    }
}
