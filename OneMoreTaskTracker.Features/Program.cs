using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Bounds;
using OneMoreTaskTracker.Features.Features.Create;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Features.Features.Get;
using OneMoreTaskTracker.Features.Features.List;
using OneMoreTaskTracker.Features.Features.Update;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables();

builder.Services.AddGrpc();
FeatureMappingConfig.Register();
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
        await DevFeatureSeeder.SeedAsync(featuresDb);
}

if (app.Environment.IsDevelopment())
    app.MapGrpcReflectionService();

app.MapGrpcService<CreateFeatureHandler>();
app.MapGrpcService<UpdateFeatureHandler>();
app.MapGrpcService<ListFeaturesHandler>();
app.MapGrpcService<GetFeatureHandler>();
app.MapGrpcService<GetFeatureBoundsHandler>();
// Per-field PATCH handlers for the Gantt inline-edit feature (backend-plan.md).
app.MapGrpcService<UpdateFeatureTitleHandler>();
app.MapGrpcService<UpdateFeatureDescriptionHandler>();
app.MapGrpcService<UpdateStageOwnerHandler>();
app.MapGrpcService<UpdateStagePlannedStartHandler>();
app.MapGrpcService<UpdateStagePlannedEndHandler>();

app.Run();

public partial class Program { }
