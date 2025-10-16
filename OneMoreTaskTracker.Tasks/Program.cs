using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Proto.Clients.Branches;
using OneMoreTaskTracker.Proto.Clients.Events;
using OneMoreTaskTracker.Proto.Clients.MergeRequests;
using OneMoreTaskTracker.Proto.Clients.Projects;
using OneMoreTaskTracker.Tasks.MergeRequests;
using OneMoreTaskTracker.Tasks.Projects;
using OneMoreTaskTracker.Tasks.Tasks.Create;
using OneMoreTaskTracker.Tasks.Tasks.Data;
using OneMoreTaskTracker.Tasks.Tasks.Get;
using OneMoreTaskTracker.Tasks.Tasks.List;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("appsettings.json", true, true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", true, true)
    .AddEnvironmentVariables();

// Add services to the container.
builder.Services.AddGrpc();
builder.Services.AddTransient<IProjectsProvider, EventBasedProjectsProvider>();
builder.Services.AddTransient<IMrsProvider, MrsProvider>();
builder.Services.AddDbContextPool<TasksDbContext>(opt => opt.UseNpgsql(
    builder.Configuration.GetConnectionString("TasksContext")));


if (builder.Environment.IsDevelopment())
    builder.Services.AddGrpcReflection();

// These clients will call back to the server
builder.Services
    .AddGrpcClient<EventsFinder.EventsFinderClient>((s, o) =>
    {
        o.Address = GetGitLabProxyAddress(s);
    })
    .EnableCallContextPropagation();
builder.Services
    .AddGrpcClient<BranchesCreator.BranchesCreatorClient>((s, o) =>
    {
        o.Address = GetGitLabProxyAddress(s);
    })
    .EnableCallContextPropagation();
builder.Services
    .AddGrpcClient<ProjectGetter.ProjectGetterClient>((s, o) =>
    {
        o.Address = GetGitLabProxyAddress(s);
    })
    .EnableCallContextPropagation();
builder.Services
    .AddGrpcClient<MrFinder.MrFinderClient>((s, o) =>
    {
        o.Address = GetGitLabProxyAddress(s);
    })
    .EnableCallContextPropagation();
builder.Services
    .AddGrpcClient<MrCreator.MrCreatorClient>((s, o) =>
    {
        o.Address = GetGitLabProxyAddress(s);
    })
    .EnableCallContextPropagation();
builder.Services
    .AddGrpcClient<MrMerger.MrMergerClient>((s, o) =>
    {
        o.Address = GetGitLabProxyAddress(s);
    })
    .EnableCallContextPropagation();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
    scope.ServiceProvider.GetRequiredService<TasksDbContext>().Database.Migrate();

if (app.Environment.IsDevelopment())
    app.MapGrpcReflectionService();

app.MapGrpcService<GetTaskHandler>();
app.MapGrpcService<CreateTaskHandler>();
app.MapGrpcService<ListTasksHandler>();

app.Run();
return;

Uri GetGitLabProxyAddress(IServiceProvider serviceProvider) => new(
    serviceProvider.GetRequiredService<IConfiguration>().GetValue<string>("GitLabProxy:Address")
    ?? throw new ArgumentException("GitLab base URL is not set"));