using FluentAssertions;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features;
using Xunit;

namespace OneMoreTaskTracker.Features.Tests.Features.Data;

public sealed class FeatureTrackStageScopeTests
{
    [Fact]
    public void AdmittedKeys_Frontend_ReturnsExactlyFiveKeys()
    {
        var keys = FeatureTrackStageScope.AdmittedKeys(FeatureTrackKind.Frontend);

        keys.Should().HaveCount(5);
    }

    [Fact]
    public void AdmittedKeys_Backend_ReturnsExactlyFiveKeys()
    {
        var keys = FeatureTrackStageScope.AdmittedKeys(FeatureTrackKind.Backend);

        keys.Should().HaveCount(5);
    }

    [Fact]
    public void AdmittedKeys_Frontend_DoesNotContainCsApproving()
    {
        var keys = FeatureTrackStageScope.AdmittedKeys(FeatureTrackKind.Frontend);

        keys.Should().NotContain(FeatureTrackStageKey.TrackStageCsApproving);
    }

    [Fact]
    public void AdmittedKeys_Backend_DoesNotContainSrApproving()
    {
        var keys = FeatureTrackStageScope.AdmittedKeys(FeatureTrackKind.Backend);

        keys.Should().NotContain(FeatureTrackStageKey.TrackStageSrApproving);
    }

    [Fact]
    public void AdmittedKeys_Frontend_ContainsExpectedKeys()
    {
        var keys = FeatureTrackStageScope.AdmittedKeys(FeatureTrackKind.Frontend);

        keys.Should().Contain([
            FeatureTrackStageKey.TrackStageSrApproving,
            FeatureTrackStageKey.TrackStageDevelopment,
            FeatureTrackStageKey.TrackStageStandTesting,
            FeatureTrackStageKey.TrackStageEthalonTesting,
            FeatureTrackStageKey.TrackStageReleaseToLive,
        ]);
    }

    [Fact]
    public void AdmittedKeys_Backend_ContainsExpectedKeys()
    {
        var keys = FeatureTrackStageScope.AdmittedKeys(FeatureTrackKind.Backend);

        keys.Should().Contain([
            FeatureTrackStageKey.TrackStageCsApproving,
            FeatureTrackStageKey.TrackStageDevelopment,
            FeatureTrackStageKey.TrackStageStandTesting,
            FeatureTrackStageKey.TrackStageEthalonTesting,
            FeatureTrackStageKey.TrackStageReleaseToLive,
        ]);
    }

    [Theory]
    [InlineData(FeatureTrackStageKey.TrackStageSrApproving, true)]
    [InlineData(FeatureTrackStageKey.TrackStageCsApproving, false)]
    [InlineData(FeatureTrackStageKey.TrackStageDevelopment, true)]
    public void IsAdmittedFor_Frontend_CorrectlyClassifiesKeys(FeatureTrackStageKey key, bool expected)
    {
        FeatureTrackStageScope.IsAdmittedFor(FeatureTrackKind.Frontend, key).Should().Be(expected);
    }

    [Theory]
    [InlineData(FeatureTrackStageKey.TrackStageCsApproving, true)]
    [InlineData(FeatureTrackStageKey.TrackStageSrApproving, false)]
    [InlineData(FeatureTrackStageKey.TrackStageDevelopment, true)]
    public void IsAdmittedFor_Backend_CorrectlyClassifiesKeys(FeatureTrackStageKey key, bool expected)
    {
        FeatureTrackStageScope.IsAdmittedFor(FeatureTrackKind.Backend, key).Should().Be(expected);
    }
}
