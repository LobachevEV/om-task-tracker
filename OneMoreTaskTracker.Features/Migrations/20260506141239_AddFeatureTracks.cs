using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OneMoreTaskTracker.Features.Migrations
{
    /// <inheritdoc />
    public partial class AddFeatureTracks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FeatureTracks",
                schema: "features",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FeatureId = table.Column<int>(type: "integer", nullable: false),
                    Kind = table.Column<int>(type: "integer", nullable: false),
                    TrackOwnerUserId = table.Column<int>(type: "integer", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeatureTracks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FeatureTracks_Features_FeatureId",
                        column: x => x.FeatureId,
                        principalSchema: "features",
                        principalTable: "Features",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FeatureTrackStages",
                schema: "features",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FeatureTrackId = table.Column<int>(type: "integer", nullable: false),
                    StageKey = table.Column<int>(type: "integer", nullable: false),
                    PlannedStart = table.Column<DateOnly>(type: "date", nullable: true),
                    PlannedEnd = table.Column<DateOnly>(type: "date", nullable: true),
                    StageOwnerUserId = table.Column<int>(type: "integer", nullable: true),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeatureTrackStages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FeatureTrackStages_FeatureTracks_FeatureTrackId",
                        column: x => x.FeatureTrackId,
                        principalSchema: "features",
                        principalTable: "FeatureTracks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FeatureTracks_FeatureId_Kind",
                schema: "features",
                table: "FeatureTracks",
                columns: new[] { "FeatureId", "Kind" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FeatureTracks_TrackOwnerUserId",
                schema: "features",
                table: "FeatureTracks",
                column: "TrackOwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_FeatureTrackStages_FeatureTrackId_StageKey",
                schema: "features",
                table: "FeatureTrackStages",
                columns: new[] { "FeatureTrackId", "StageKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FeatureTrackStages_StageOwnerUserId",
                schema: "features",
                table: "FeatureTrackStages",
                column: "StageOwnerUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FeatureTrackStages",
                schema: "features");

            migrationBuilder.DropTable(
                name: "FeatureTracks",
                schema: "features");
        }
    }
}
