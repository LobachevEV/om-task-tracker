using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Users;
using OneMoreTaskTracker.Users.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables();

// TODO: add mTLS or internal service token validation to prevent unauthenticated direct gRPC access
builder.Services.AddGrpc();
builder.Services.AddDbContextPool<UsersDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("UsersContext")));

if (builder.Environment.IsDevelopment())
    builder.Services.AddGrpcReflection();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
    scope.ServiceProvider.GetRequiredService<UsersDbContext>().Database.Migrate();

if (app.Environment.IsDevelopment())
    app.MapGrpcReflectionService();

app.MapGrpcService<UserServiceHandler>();

app.Run();
