using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OneMoreTaskTracker.Features.Migrations
{
    /// <inheritdoc />
    public partial class DropFlatFeatureStageColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CsApprovingOwnerUserId",
                schema: "features",
                table: "Features");

            migrationBuilder.DropColumn(
                name: "CsApprovingPlannedEnd",
                schema: "features",
                table: "Features");

            migrationBuilder.DropColumn(
                name: "CsApprovingPlannedStart",
                schema: "features",
                table: "Features");

            migrationBuilder.DropColumn(
                name: "DevelopmentOwnerUserId",
                schema: "features",
                table: "Features");

            migrationBuilder.DropColumn(
                name: "DevelopmentPlannedEnd",
                schema: "features",
                table: "Features");

            migrationBuilder.DropColumn(
                name: "DevelopmentPlannedStart",
                schema: "features",
                table: "Features");

            migrationBuilder.DropColumn(
                name: "EthalonTestingOwnerUserId",
                schema: "features",
                table: "Features");

            migrationBuilder.DropColumn(
                name: "EthalonTestingPlannedEnd",
                schema: "features",
                table: "Features");

            migrationBuilder.DropColumn(
                name: "EthalonTestingPlannedStart",
                schema: "features",
                table: "Features");

            migrationBuilder.DropColumn(
                name: "LiveReleaseOwnerUserId",
                schema: "features",
                table: "Features");

            migrationBuilder.DropColumn(
                name: "LiveReleasePlannedEnd",
                schema: "features",
                table: "Features");

            migrationBuilder.DropColumn(
                name: "LiveReleasePlannedStart",
                schema: "features",
                table: "Features");

            migrationBuilder.DropColumn(
                name: "TestingOwnerUserId",
                schema: "features",
                table: "Features");

            migrationBuilder.DropColumn(
                name: "TestingPlannedEnd",
                schema: "features",
                table: "Features");

            migrationBuilder.DropColumn(
                name: "TestingPlannedStart",
                schema: "features",
                table: "Features");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
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
        }
    }
}
