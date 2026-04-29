using FluentValidation.Results;

namespace OneMoreTaskTracker.Tasks.Validation;

public static class ValidationDetailComposer
{
    public static string Compose(IEnumerable<ValidationFailure> failures) =>
        string.Join("; ", failures.Select(f => f.ErrorMessage));
}
