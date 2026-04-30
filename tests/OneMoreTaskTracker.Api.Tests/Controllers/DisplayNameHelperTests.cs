using FluentAssertions;
using OneMoreTaskTracker.Api.Controllers;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Controllers;

public sealed class DisplayNameHelperTests
{
    [Fact]
    public void ExtractDisplayName_ReturnsEmpty_WhenEmailIsNullOrEmpty()
    {
        DisplayNameHelper.ExtractDisplayName(string.Empty).Should().BeEmpty();
        DisplayNameHelper.ExtractDisplayName(null!).Should().BeEmpty();
    }

    [Fact]
    public void ExtractDisplayName_TitleCasesEachLocalPartSegment()
    {
        DisplayNameHelper.ExtractDisplayName("john.doe@example.com").Should().Be("John Doe");
        DisplayNameHelper.ExtractDisplayName("anna_marie-smith@x").Should().Be("Anna Marie Smith");
    }

    [Fact]
    public void ExtractDisplayName_KeepsEmptyParts_WhenSeparatorsRunTogether()
    {
        DisplayNameHelper.ExtractDisplayName("john..doe@example.com").Should().Be("John  Doe");
    }

    [Fact]
    public void ExtractDisplayName_ReturnsSingleCapitalized_WhenLocalPartHasNoSeparator()
    {
        DisplayNameHelper.ExtractDisplayName("alice@example.com").Should().Be("Alice");
    }
}
