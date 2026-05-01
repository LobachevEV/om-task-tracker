using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OneMoreTaskTracker.Features.Migrations
{
    /// <inheritdoc />
    public partial class RewriteFeatureTaxonomyV2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FeatureStagePlans",
                schema: "features");

            migrationBuilder.CreateTable(
                name: "FeatureGates",
                schema: "features",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FeatureId = table.Column<int>(type: "integer", nullable: false),
                    GateKey = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Kind = table.Column<short>(type: "smallint", nullable: false),
                    Track = table.Column<short>(type: "smallint", nullable: true),
                    Status = table.Column<short>(type: "smallint", nullable: false),
                    ApproverUserId = table.Column<int>(type: "integer", nullable: false),
                    ApprovedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RequestedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RejectionReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeatureGates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FeatureGates_Features_FeatureId",
                        column: x => x.FeatureId,
                        principalSchema: "features",
                        principalTable: "Features",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FeatureSubStages",
                schema: "features",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FeatureId = table.Column<int>(type: "integer", nullable: false),
                    Track = table.Column<short>(type: "smallint", nullable: false),
                    PhaseKind = table.Column<short>(type: "smallint", nullable: false),
                    Ordinal = table.Column<short>(type: "smallint", nullable: false),
                    OwnerUserId = table.Column<int>(type: "integer", nullable: false),
                    PlannedStart = table.Column<DateOnly>(type: "date", nullable: true),
                    PlannedEnd = table.Column<DateOnly>(type: "date", nullable: true),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeatureSubStages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FeatureSubStages_Features_FeatureId",
                        column: x => x.FeatureId,
                        principalSchema: "features",
                        principalTable: "Features",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FeatureGates_ApproverUserId",
                schema: "features",
                table: "FeatureGates",
                column: "ApproverUserId");

            migrationBuilder.CreateIndex(
                name: "IX_FeatureGates_FeatureId_GateKey",
                schema: "features",
                table: "FeatureGates",
                columns: new[] { "FeatureId", "GateKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FeatureSubStages_FeatureId_Track_PhaseKind",
                schema: "features",
                table: "FeatureSubStages",
                columns: new[] { "FeatureId", "Track", "PhaseKind" });

            migrationBuilder.CreateIndex(
                name: "IX_FeatureSubStages_FeatureId_Track_PhaseKind_Ordinal",
                schema: "features",
                table: "FeatureSubStages",
                columns: new[] { "FeatureId", "Track", "PhaseKind", "Ordinal" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FeatureSubStages_OwnerUserId",
                schema: "features",
                table: "FeatureSubStages",
                column: "OwnerUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FeatureGates",
                schema: "features");

            migrationBuilder.DropTable(
                name: "FeatureSubStages",
                schema: "features");

            migrationBuilder.CreateTable(
                name: "FeatureStagePlans",
                schema: "features",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FeatureId = table.Column<int>(type: "integer", nullable: false),
                    PerformerUserId = table.Column<int>(type: "integer", nullable: false),
                    PlannedEnd = table.Column<DateOnly>(type: "date", nullable: true),
                    PlannedStart = table.Column<DateOnly>(type: "date", nullable: true),
                    Stage = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false)
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
        }
    }
}
