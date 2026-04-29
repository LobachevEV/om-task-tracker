namespace OneMoreTaskTracker.Features.Features.Data;

public static class PlannedDate
{
    public static DateOnly? Parse(string raw) =>
        string.IsNullOrWhiteSpace(raw)
            ? null
            : DateOnly.ParseExact(raw, "yyyy-MM-dd");
}
