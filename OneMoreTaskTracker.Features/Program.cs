using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables();

builder.Services.AddGrpc();
builder.Services.AddDbContextPool<FeaturesDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("FeaturesContext")));

if (builder.Environment.IsDevelopment())
    builder.Services.AddGrpcReflection();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
    scope.ServiceProvider.GetRequiredService<FeaturesDbContext>().Database.Migrate();

if (app.Environment.IsDevelopment())
    app.MapGrpcReflectionService();

app.Run();
