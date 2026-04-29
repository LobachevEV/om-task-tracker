using FluentValidation.Results;

namespace OneMoreTaskTracker.Users.Validation;

public static class ValidationDetailComposer
{
    public static string Compose(IEnumerable<ValidationFailure> failures) =>
        string.Join("; ", failures.Select(f => f.ErrorMessage));
}
