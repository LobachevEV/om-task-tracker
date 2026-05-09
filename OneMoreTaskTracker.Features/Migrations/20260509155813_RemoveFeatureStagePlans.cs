using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace OneMoreTaskTracker.Features.Migrations
{
    /// <inheritdoc />
    public partial class RemoveFeatureStagePlans : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CsApprovingOwnerUserId",
                schema: "features",
                table: "Features",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "CsApprovingPlannedEnd",
                schema: "features",
                table: "Features",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "CsApprovingPlannedStart",
                schema: "features",
                table: "Features",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DevelopmentOwnerUserId",
                schema: "features",
                table: "Features",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "DevelopmentPlannedEnd",
                schema: "features",
                table: "Features",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "DevelopmentPlannedStart",
                schema: "features",
                table: "Features",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EthalonTestingOwnerUserId",
                schema: "features",
                table: "Features",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "EthalonTestingPlannedEnd",
                schema: "features",
                table: "Features",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "EthalonTestingPlannedStart",
                schema: "features",
                table: "Features",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "LiveReleaseOwnerUserId",
                schema: "features",
                table: "Features",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "LiveReleasePlannedEnd",
                schema: "features",
                table: "Features",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "LiveReleasePlannedStart",
                schema: "features",
                table: "Features",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TestingOwnerUserId",
                schema: "features",
                table: "Features",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "TestingPlannedEnd",
                schema: "features",
                table: "Features",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "TestingPlannedStart",
                schema: "features",
                table: "Features",
                type: "date",
                nullable: true);

            // Backfill per-stage data from feature_stage_plans before dropping the table.
            // Stage ordinals: 0=CsApproving, 1=Development, 2=Testing, 3=EthalonTesting, 4=LiveRelease.
            // PerformerUserId=0 means unassigned (proto3 default); treat as NULL.
            migrationBuilder.Sql(@"
UPDATE features.""Features"" f
SET
    ""CsApprovingPlannedStart"" = sp.""PlannedStart"",
    ""CsApprovingPlannedEnd""   = sp.""PlannedEnd"",
    ""CsApprovingOwnerUserId""  = NULLIF(sp.""PerformerUserId"", 0)
FROM features.""FeatureStagePlans"" sp
WHERE sp.""FeatureId"" = f.""Id""
  AND sp.""Stage"" = 0;
");

            migrationBuilder.Sql(@"
UPDATE features.""Features"" f
SET
    ""DevelopmentPlannedStart"" = sp.""PlannedStart"",
    ""DevelopmentPlannedEnd""   = sp.""PlannedEnd"",
    ""DevelopmentOwnerUserId""  = NULLIF(sp.""PerformerUserId"", 0)
FROM features.""FeatureStagePlans"" sp
WHERE sp.""FeatureId"" = f.""Id""
  AND sp.""Stage"" = 1;
");

            migrationBuilder.Sql(@"
UPDATE features.""Features"" f
SET
    ""TestingPlannedStart"" = sp.""PlannedStart"",
    ""TestingPlannedEnd""   = sp.""PlannedEnd"",
    ""TestingOwnerUserId""  = NULLIF(sp.""PerformerUserId"", 0)
FROM features.""FeatureStagePlans"" sp
WHERE sp.""FeatureId"" = f.""Id""
  AND sp.""Stage"" = 2;
");

            migrationBuilder.Sql(@"
UPDATE features.""Features"" f
SET
    ""EthalonTestingPlannedStart"" = sp.""PlannedStart"",
    ""EthalonTestingPlannedEnd""   = sp.""PlannedEnd"",
    ""EthalonTestingOwnerUserId""  = NULLIF(sp.""PerformerUserId"", 0)
FROM features.""FeatureStagePlans"" sp
WHERE sp.""FeatureId"" = f.""Id""
  AND sp.""Stage"" = 3;
");

            migrationBuilder.Sql(@"
UPDATE features.""Features"" f
SET
    ""LiveReleasePlannedStart"" = sp.""PlannedStart"",
    ""LiveReleasePlannedEnd""   = sp.""PlannedEnd"",
    ""LiveReleaseOwnerUserId""  = NULLIF(sp.""PerformerUserId"", 0)
FROM features.""FeatureStagePlans"" sp
WHERE sp.""FeatureId"" = f.""Id""
  AND sp.""Stage"" = 4;
");

            migrationBuilder.DropTable(
                name: "FeatureStagePlans",
                schema: "features");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            throw new NotSupportedException("Forward-only migration — down is not supported.");
        }
    }
}
