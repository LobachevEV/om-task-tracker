using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OneMoreTaskTracker.Features.Migrations
{
    /// <inheritdoc />
    public partial class AddFeatureStagePlans : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FeatureStagePlans",
                schema: "features",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FeatureId = table.Column<int>(type: "integer", nullable: false),
                    Stage = table.Column<int>(type: "integer", nullable: false),
                    PlannedStart = table.Column<DateOnly>(type: "date", nullable: true),
                    PlannedEnd = table.Column<DateOnly>(type: "date", nullable: true),
                    PerformerUserId = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeatureStagePlans", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FeatureStagePlans_Features_FeatureId",
                        column: x => x.FeatureId,
                        principalSchema: "features",
                        principalTable: "Features",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FeatureStagePlans_FeatureId_Stage",
                schema: "features",
                table: "FeatureStagePlans",
                columns: new[] { "FeatureId", "Stage" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FeatureStagePlans_PerformerUserId",
                schema: "features",
                table: "FeatureStagePlans",
                column: "PerformerUserId");

            // Back-fill: every existing feature gets 5 empty stage-plan rows
            // (one per FeatureState ordinal) so post-migration reads honour the
            // "exactly 5 rows per feature" invariant. Idempotent via NOT EXISTS
            // so the migration is safe against EnsureDeleted + replay in local dev.
            // See backend-plan.md § Migration for the rationale.
            migrationBuilder.Sql(@"
                INSERT INTO features.""FeatureStagePlans""
                    (""FeatureId"", ""Stage"", ""PlannedStart"", ""PlannedEnd"", ""PerformerUserId"", ""CreatedAt"", ""UpdatedAt"")
                SELECT f.""Id"", s.stage, NULL, NULL, 0, NOW(), NOW()
                  FROM features.""Features"" f
                  CROSS JOIN (VALUES (0),(1),(2),(3),(4)) AS s(stage)
                  WHERE NOT EXISTS (
                    SELECT 1 FROM features.""FeatureStagePlans"" sp
                      WHERE sp.""FeatureId"" = f.""Id"" AND sp.""Stage"" = s.stage
                  );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FeatureStagePlans",
                schema: "features");
        }
    }
}
