using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OneMoreTaskTracker.Features.Migrations
{
    /// <inheritdoc />
    public partial class DeleteCrossKindTrackStages : Migration
    {
        // Proto ordinals:
        //   FeatureTrackKind.Frontend = 0, FeatureTrackKind.Backend = 1
        //   FeatureTrackStageKey.TrackStageSrApproving = 1 (Frontend-only)
        //   FeatureTrackStageKey.TrackStageCsApproving = 2 (Backend-only)

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Delete SrApproving (1) stages on Backend (kind=1) tracks.
            migrationBuilder.Sql(@"
                DELETE FROM features.""FeatureTrackStages"" fts
                USING features.""FeatureTracks"" ft
                WHERE fts.""FeatureTrackId"" = ft.""Id""
                  AND ft.""Kind"" = 1
                  AND fts.""StageKey"" = 1;
            ");

            // Delete CsApproving (2) stages on Frontend (kind=0) tracks.
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
            // No rollback for a data-cleanup migration.
            // Cross-kind rows are invalid by design; reintroducing them would corrupt state.
        }
    }
}
