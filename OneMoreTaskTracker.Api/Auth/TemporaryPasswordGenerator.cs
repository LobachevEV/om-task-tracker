using System.Security.Cryptography;

namespace OneMoreTaskTracker.Api.Auth;

public static class TemporaryPasswordGenerator
{
    private const string Lowercase = "abcdefghijklmnopqrstuvwxyz";
    private const string Uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private const string Digits = "0123456789";
    private const string Symbols = "!@#$%^&*";
    private const int Length = 12;

    public static string Generate()
    {
        var allChars = Lowercase + Uppercase + Digits + Symbols;
        var password = new char[Length];

        // Ensure at least one character from each category
        password[0] = GetRandomChar(Lowercase);
        password[1] = GetRandomChar(Uppercase);
        password[2] = GetRandomChar(Digits);
        password[3] = GetRandomChar(Symbols);

        // Fill remaining positions with random characters from all categories
        for (int i = 4; i < Length; i++)
        {
            password[i] = GetRandomChar(allChars);
        }

        // Shuffle the password to randomize positions
        Shuffle(password);

        return new string(password);
    }

    private static char GetRandomChar(string source)
    {
        var index = RandomNumberGenerator.GetInt32(source.Length);
        return source[index];
    }

    private static void Shuffle(char[] array)
    {
        for (int i = array.Length - 1; i > 0; i--)
        {
            var j = RandomNumberGenerator.GetInt32(i + 1);
            (array[i], array[j]) = (array[j], array[i]);
        }
    }
}
