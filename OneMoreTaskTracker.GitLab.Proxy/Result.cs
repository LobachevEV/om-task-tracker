namespace OneMoreTaskTracker.GitLab.Proxy;

public record Result
{
    protected Result(bool isSuccess)
    {
        IsSuccess = isSuccess;
    }

    protected Result(string message) : this(false)
    {
        Message = message;
    }

    public bool IsSuccess { get; }
    public string? Message { get; }

    public static implicit operator Result(bool success) => new(success);

    public static implicit operator Result(string message) => new(message);
}

public record Result<TDto> : Result
{
    private Result(string message) : base(message)
    {
    }
    private Result() : base(false)
    {
    }
    private Result(TDto dto) : base(true)
    {
        Dto = dto;
    }

    public TDto? Dto { get; init; }

    public static implicit operator Result<TDto>(TDto dto) => dto is null ? new Result<TDto>() : new Result<TDto>(dto);

    public static implicit operator Result<TDto>(string message) => new(message);
}