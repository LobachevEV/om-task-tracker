using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.ObjectPool;
using OneMoreTaskTracker.GitLab.Proxy;
using OneMoreTaskTracker.GitLab.Proxy.Services;
using System.Net.Http.Headers;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration
    .AddJsonFile("appsettings.json", true, true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", true, true)
    .AddEnvironmentVariables();

builder.Services.TryAddSingleton<ObjectPoolProvider, DefaultObjectPoolProvider>();
builder.Services.AddSingleton<ObjectPool<StringBuilder>>(serviceProvider =>
{
    var provider = serviceProvider.GetRequiredService<ObjectPoolProvider>();
    var policy = new DefaultPooledObjectPolicy<StringBuilder>();
    return provider.Create(policy);
});

// Add services to the container.
builder.Services.AddGrpc();
builder.Services.AddGrpcReflection();
builder.Services.AddHttpClient<IGitLabApiClient, GitLabApiClient>((serviceProvider, client) =>
{
    var cfg = serviceProvider.GetRequiredService<IConfiguration>();
    var uriString = cfg.GetValue<string>("GitLab:BaseUrl") ?? throw new ArgumentException("GitLab base URL is not set");
    client.BaseAddress = new Uri(uriString);

    var gitlabToken = cfg.GetValue<string>("GitLab:Token")
                      ?? throw new ArgumentException("GITLAB_TOKEN environment variable is not set");
    client.DefaultRequestHeaders.Add("PRIVATE-TOKEN", gitlabToken);
    client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
});

var app = builder.Build();

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(
        Path.Combine(builder.Environment.ContentRootPath, "./Protos/")),
    RequestPath = "/protos"
});

// Configure the HTTP request pipeline.
app.MapGrpcService<FindEventsHandler>();
app.MapGrpcService<GetProjectHandler>();
app.MapGrpcService<CreateBranchHandler>();
app.MapGrpcService<FindMrHandler>();
app.MapGrpcService<CreateMrHandler>();
app.MapGrpcService<MergeMrService>();

if (app.Environment.IsDevelopment())
    app.MapGrpcReflectionService();

app.Run();