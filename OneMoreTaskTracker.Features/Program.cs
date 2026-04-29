using FluentValidation;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Get;
using OneMoreTaskTracker.Features.Features.List;
using OneMoreTaskTracker.Features.Features.Update;
using OneMoreTaskTracker.Features.Validation;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables();

builder.Services.AddGrpc(o => o.Interceptors.Add<ValidationExceptionInterceptor>());
builder.Services.AddValidatorsFromAssemblyContaining<CreateFeatureRequestValidator>();
FeatureMappingConfig.Register();
builder.Services.AddSingleton<TimeProvider>(TimeProvider.System);
builder.Services.AddScoped<IRequestClock, RequestClock>();
builder.Services.AddScoped<DevFeatureSeeder>();
builder.Services.AddDbContextPool<FeaturesDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("FeaturesContext")));

if (builder.Environment.IsDevelopment())
    builder.Services.AddGrpcReflection();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var featuresDb = scope.ServiceProvider.GetRequiredService<FeaturesDbContext>();
    featuresDb.Database.Migrate();

    if (app.Environment.IsDevelopment())
    {
        var seeder = scope.ServiceProvider.GetRequiredService<DevFeatureSeeder>();
        await seeder.SeedAsync(featuresDb);
    }
}

if (args.Contains("--migrate"))
    return;

if (app.Environment.IsDevelopment())
    app.MapGrpcReflectionService();

app.MapGrpcService<CreateFeatureHandler>();
app.MapGrpcService<ListFeaturesHandler>();
app.MapGrpcService<GetFeatureHandler>();
app.MapGrpcService<PatchFeatureHandler>();
app.MapGrpcService<PatchFeatureStageHandler>();

app.Run();

public partial class Program { }
