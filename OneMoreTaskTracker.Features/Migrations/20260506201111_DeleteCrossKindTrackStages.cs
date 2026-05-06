using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OneMoreTaskTracker.Features.Migrations
{
    /// <inheritdoc />
    public partial class DeleteCrossKindTrackStages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Delete SrApproving (ordinal 1) stages on Backend (kind=1) tracks.
            migrationBuilder.Sql(@"
                DELETE FROM features.""FeatureTrackStages"" fts
                USING features.""FeatureTracks"" ft
                WHERE fts.""FeatureTrackId"" = ft.""Id""
                  AND ft.""Kind"" = 1
                  AND fts.""StageKey"" = 1;
            ");

            // Delete CsApproving (ordinal 2) stages on Frontend (kind=0) tracks.
            migrationBuilder.Sql(@"
                DELETE FROM features.""FeatureTrackStages"" fts
                USING features.""FeatureTracks"" ft
                WHERE fts.""FeatureTrackId"" = ft.""Id""
                  AND ft.""Kind"" = 0
                  AND fts.""StageKey"" = 2;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data-cleanup migration: cross-kind rows are invalid by design.
            // Cannot reconstitute deleted data; rollback is intentionally a no-op.
        }
    }
}
