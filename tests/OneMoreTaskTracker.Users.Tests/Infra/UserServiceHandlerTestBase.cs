using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using OneMoreTaskTracker.Users.Data;

namespace OneMoreTaskTracker.Users.Tests.Infra;

public abstract class UserServiceHandlerTestBase : IDisposable
{
    protected static readonly string Password123Hash =
        BCrypt.Net.BCrypt.HashPassword("password123", workFactor: 4);

    protected readonly UsersDbContext DbContext;
    protected readonly UserServiceHandler Sut;
    protected readonly ServerCallContext Ctx;

    protected UserServiceHandlerTestBase()
    {
        var options = new DbContextOptionsBuilder<UsersDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        DbContext = new UsersDbContext(options);
        Sut = new UserServiceHandler(DbContext);
        Ctx = Substitute.For<ServerCallContext>();
        Ctx.CancellationToken.Returns(CancellationToken.None);
    }

    public void Dispose()
    {
        DbContext.Dispose();
    }
}
