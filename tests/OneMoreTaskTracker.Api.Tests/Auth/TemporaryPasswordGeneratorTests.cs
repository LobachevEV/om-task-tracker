using FluentAssertions;
using OneMoreTaskTracker.Api.Auth;
using Xunit;

namespace OneMoreTaskTracker.Api.Tests.Auth;

public sealed class TemporaryPasswordGeneratorTests
{
    [Fact]
    public void Generate_ProducesLength12()
    {
        var password = TemporaryPasswordGenerator.Generate();
        password.Should().HaveLength(12);
    }

    [Fact]
    public void Generate_ProducesMixedCase()
    {
        var password = TemporaryPasswordGenerator.Generate();
        password.Any(char.IsUpper).Should().BeTrue();
        password.Any(char.IsLower).Should().BeTrue();
    }

    [Fact]
    public void Generate_ProducesAtLeastOneDigit()
    {
        var password = TemporaryPasswordGenerator.Generate();
        password.Any(char.IsDigit).Should().BeTrue();
    }

    [Fact]
    public void Generate_ProducesAtLeastOneSymbol()
    {
        var symbols = "!@#$%^&*";
        var password = TemporaryPasswordGenerator.Generate();
        password.Any(c => symbols.Contains(c)).Should().BeTrue();
    }

    [Fact]
    public void Generate_InvariantAcross100Iterations()
    {
        for (int i = 0; i < 100; i++)
        {
            var password = TemporaryPasswordGenerator.Generate();
            password.Should().HaveLength(12);
            password.Any(char.IsUpper).Should().BeTrue();
            password.Any(char.IsLower).Should().BeTrue();
            password.Any(char.IsDigit).Should().BeTrue();
            password.Any(c => "!@#$%^&*".Contains(c)).Should().BeTrue();
        }
    }

    [Fact]
    public void Generate_ProducesDifferentValuesEachTime()
    {
        var password1 = TemporaryPasswordGenerator.Generate();
        var password2 = TemporaryPasswordGenerator.Generate();
        password1.Should().NotBe(password2);
    }

    [Fact]
    public void Generate_OnlyUsesValidCharacters()
    {
        var validChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        var password = TemporaryPasswordGenerator.Generate();
        foreach (var c in password)
        {
            validChars.Should().Contain(c.ToString());
        }
    }
}
