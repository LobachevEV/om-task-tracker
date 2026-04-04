using FluentAssertions;
using OneMoreTaskTracker.GitLab.Proxy;
using Xunit;

namespace OneMoreTaskTracker.GitLab.Proxy.Tests;

public class ResultTests
{
    [Fact]
    public void Result_FromTrue_IsSuccess()
    {
        // Act
        Result result = true;

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Message.Should().BeNull();
    }

    [Fact]
    public void Result_FromFalse_IsNotSuccess()
    {
        // Act
        Result result = false;

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Message.Should().BeNull();
    }

    [Fact]
    public void Result_FromString_IsNotSuccessWithMessage()
    {
        // Arrange
        var message = "Error occurred";

        // Act
        Result result = message;

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Message.Should().Be(message);
    }

    [Fact]
    public void ResultT_FromNonNullDto_IsSuccessWithDto()
    {
        // Arrange
        var dto = 42;

        // Act
        Result<int> result = dto;

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Dto.Should().Be(dto);
        result.Message.Should().BeNull();
    }

    [Fact]
    public void ResultT_FromNullDto_IsNotSuccess()
    {
        // Arrange
        TestDto? dto = null;

        // Act
        Result<TestDto> result = dto;

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Dto.Should().BeNull();
    }

    private class TestDto { }

    [Fact]
    public void ResultT_FromString_IsNotSuccessWithMessage()
    {
        // Arrange
        var message = "Operation failed";

        // Act
        Result<int> result = message;

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Message.Should().Be(message);
        result.Dto.Should().Be(0);
    }
}
