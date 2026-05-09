namespace OneMoreTaskTracker.Features.Features.Data;

public class Feature
{
    public int Id { get; init; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public int State { get; set; } = (int)FeatureState.CsApproving;
    public DateOnly? PlannedStart { get; set; }
    public DateOnly? PlannedEnd { get; set; }

    public int LeadUserId { get; set; }
    public int ManagerUserId { get; set; }

    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; private set; }

    public int Version { get; private set; }

    public List<FeatureTrack> Tracks { get; init; } = [];

    // CsApproving
    public DateOnly? CsApprovingPlannedStart { get; private set; }
    public DateOnly? CsApprovingPlannedEnd { get; private set; }
    public int? CsApprovingOwnerUserId { get; private set; }

    // Development
    public DateOnly? DevelopmentPlannedStart { get; private set; }
    public DateOnly? DevelopmentPlannedEnd { get; private set; }
    public int? DevelopmentOwnerUserId { get; private set; }

    // Testing
    public DateOnly? TestingPlannedStart { get; private set; }
    public DateOnly? TestingPlannedEnd { get; private set; }
    public int? TestingOwnerUserId { get; private set; }

    // EthalonTesting
    public DateOnly? EthalonTestingPlannedStart { get; private set; }
    public DateOnly? EthalonTestingPlannedEnd { get; private set; }
    public int? EthalonTestingOwnerUserId { get; private set; }

    // LiveRelease
    public DateOnly? LiveReleasePlannedStart { get; private set; }
    public DateOnly? LiveReleasePlannedEnd { get; private set; }
    public int? LiveReleaseOwnerUserId { get; private set; }

    public void RenameTitle(string newTitle, DateTime now)
    {
        Title = newTitle ?? throw new ArgumentNullException(nameof(newTitle));
        Version += 1;
        UpdatedAt = now;
    }

    public void SetDescription(string? newDescription, DateTime now)
    {
        Description = newDescription;
        Version += 1;
        UpdatedAt = now;
    }

    public void AssignLead(int leadUserId, DateTime now)
    {
        LeadUserId = leadUserId;
        Version += 1;
        UpdatedAt = now;
    }

    public void SetStagePlannedStart(FeatureState stage, DateOnly? value, DateTime now)
    {
        switch (stage)
        {
            case FeatureState.CsApproving:      CsApprovingPlannedStart     = value; break;
            case FeatureState.Development:       DevelopmentPlannedStart     = value; break;
            case FeatureState.Testing:           TestingPlannedStart         = value; break;
            case FeatureState.EthalonTesting:    EthalonTestingPlannedStart  = value; break;
            case FeatureState.LiveRelease:       LiveReleasePlannedStart     = value; break;
        }
        Version += 1;
        UpdatedAt = now;
    }

    public void SetStagePlannedEnd(FeatureState stage, DateOnly? value, DateTime now)
    {
        switch (stage)
        {
            case FeatureState.CsApproving:      CsApprovingPlannedEnd     = value; break;
            case FeatureState.Development:       DevelopmentPlannedEnd     = value; break;
            case FeatureState.Testing:           TestingPlannedEnd         = value; break;
            case FeatureState.EthalonTesting:    EthalonTestingPlannedEnd  = value; break;
            case FeatureState.LiveRelease:       LiveReleasePlannedEnd     = value; break;
        }
        Version += 1;
        UpdatedAt = now;
    }

    public void AssignStageOwner(FeatureState stage, int? userId, DateTime now)
    {
        switch (stage)
        {
            case FeatureState.CsApproving:      CsApprovingOwnerUserId     = userId; break;
            case FeatureState.Development:       DevelopmentOwnerUserId     = userId; break;
            case FeatureState.Testing:           TestingOwnerUserId         = userId; break;
            case FeatureState.EthalonTesting:    EthalonTestingOwnerUserId  = userId; break;
            case FeatureState.LiveRelease:       LiveReleaseOwnerUserId     = userId; break;
        }
        Version += 1;
        UpdatedAt = now;
    }

    public DateOnly? GetStagePlannedStart(FeatureState stage) => stage switch
    {
        FeatureState.CsApproving    => CsApprovingPlannedStart,
        FeatureState.Development    => DevelopmentPlannedStart,
        FeatureState.Testing        => TestingPlannedStart,
        FeatureState.EthalonTesting => EthalonTestingPlannedStart,
        FeatureState.LiveRelease    => LiveReleasePlannedStart,
        _                           => null,
    };

    public DateOnly? GetStagePlannedEnd(FeatureState stage) => stage switch
    {
        FeatureState.CsApproving    => CsApprovingPlannedEnd,
        FeatureState.Development    => DevelopmentPlannedEnd,
        FeatureState.Testing        => TestingPlannedEnd,
        FeatureState.EthalonTesting => EthalonTestingPlannedEnd,
        FeatureState.LiveRelease    => LiveReleasePlannedEnd,
        _                           => null,
    };

    public int? GetStageOwnerUserId(FeatureState stage) => stage switch
    {
        FeatureState.CsApproving    => CsApprovingOwnerUserId,
        FeatureState.Development    => DevelopmentOwnerUserId,
        FeatureState.Testing        => TestingOwnerUserId,
        FeatureState.EthalonTesting => EthalonTestingOwnerUserId,
        FeatureState.LiveRelease    => LiveReleaseOwnerUserId,
        _                           => null,
    };

    public void RecomputePlannedDates()
    {
        var starts = new[] { CsApprovingPlannedStart, DevelopmentPlannedStart, TestingPlannedStart, EthalonTestingPlannedStart, LiveReleasePlannedStart };
        var ends   = new[] { CsApprovingPlannedEnd,   DevelopmentPlannedEnd,   TestingPlannedEnd,   EthalonTestingPlannedEnd,   LiveReleasePlannedEnd   };

        PlannedStart = starts.Where(d => d is not null).Select(d => d!.Value).OrderBy(d => d).Cast<DateOnly?>().FirstOrDefault();
        PlannedEnd   = ends.Where(d => d is not null).Select(d => d!.Value).OrderByDescending(d => d).Cast<DateOnly?>().FirstOrDefault();
    }

    public void Touch(DateTime now)
    {
        UpdatedAt = now;
    }
}
