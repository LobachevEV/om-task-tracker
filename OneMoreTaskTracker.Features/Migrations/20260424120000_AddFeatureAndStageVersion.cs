using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OneMoreTaskTracker.Features.Migrations
{
    /// <inheritdoc />
    public partial class AddFeatureAndStageVersion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Additive per-row optimistic-concurrency token on features.features.
            // Default 0 covers every pre-existing row without a back-fill script;
            // the token participates in EF Core's UPDATE WHERE clause via
            // IsConcurrencyToken in FeaturesDbContext.OnModelCreating.
            migrationBuilder.AddColumn<int>(
                name: "Version",
                schema: "features",
                table: "Features",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            // Symmetric token on the per-stage plan row. Stage-scoped PATCHes
            // (owner, planned-start, planned-end) bump this column so the FE's
            // If-Match reflects per-stage concurrency without churning the whole
            // feature on every stage edit.
            migrationBuilder.AddColumn<int>(
                name: "Version",
                schema: "features",
                table: "FeatureStagePlans",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Version",
                schema: "features",
                table: "FeatureStagePlans");

            migrationBuilder.DropColumn(
                name: "Version",
                schema: "features",
                table: "Features");
        }
    }
}
