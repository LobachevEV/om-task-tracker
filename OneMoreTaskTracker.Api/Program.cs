using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Middleware;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;
using OneMoreTaskTracker.Proto.Features.ListFeaturesQuery;
using OneMoreTaskTracker.Proto.Features.PatchFeatureCommand;
using OneMoreTaskTracker.Proto.Features.PatchFeatureStageCommand;
using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Proto.Tasks.AttachTaskCommand;
using OneMoreTaskTracker.Proto.Tasks.CreateTaskCommand;
using OneMoreTaskTracker.Proto.Tasks.GetTaskQuery;
using OneMoreTaskTracker.Proto.Tasks.ListTasksQuery;
using OneMoreTaskTracker.Proto.Tasks.TaskAggregateQuery;
using OneMoreTaskTracker.Proto.Users;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables();

if (builder.Environment.IsDevelopment())
    AppContext.SetSwitch("System.Net.Http.SocketsHttpHandler.Http2UnencryptedSupport", true);

// JWT
var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
    ?? throw new InvalidOperationException("Jwt configuration is missing");

if (jwtOptions.Secret.Length < 32)
    throw new InvalidOperationException("Jwt:Secret must be at least 32 characters");

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.AddSingleton<JwtTokenService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Secret)),
            ValidateLifetime = true
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddControllers();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? throw new InvalidOperationException("Cors:AllowedOrigins is not configured");

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()));

// gRPC clients
var tasksServiceAddress = builder.Configuration["TasksService:Address"]
    ?? throw new InvalidOperationException("TasksService:Address is not configured");

var usersServiceAddress = builder.Configuration["UsersService:Address"]
    ?? throw new InvalidOperationException("UsersService:Address is not configured");

var featuresServiceAddress = builder.Configuration["FeaturesService:Address"]
    ?? throw new InvalidOperationException("FeaturesService:Address is not configured");

builder.Services
    .AddGrpcClient<TaskCreator.TaskCreatorClient>(o => o.Address = new Uri(tasksServiceAddress));

builder.Services
    .AddGrpcClient<TaskLister.TaskListerClient>(o => o.Address = new Uri(tasksServiceAddress));

builder.Services
    .AddGrpcClient<TaskGetter.TaskGetterClient>(o => o.Address = new Uri(tasksServiceAddress));

builder.Services
    .AddGrpcClient<TaskMover.TaskMoverClient>(o => o.Address = new Uri(tasksServiceAddress));

builder.Services
    .AddGrpcClient<TaskAggregateQuery.TaskAggregateQueryClient>(o => o.Address = new Uri(tasksServiceAddress));

builder.Services
    .AddGrpcClient<UserService.UserServiceClient>(o => o.Address = new Uri(usersServiceAddress));

builder.Services
    .AddGrpcClient<FeatureCreator.FeatureCreatorClient>(o => o.Address = new Uri(featuresServiceAddress));

builder.Services
    .AddGrpcClient<FeaturesLister.FeaturesListerClient>(o => o.Address = new Uri(featuresServiceAddress));

builder.Services
    .AddGrpcClient<FeatureGetter.FeatureGetterClient>(o => o.Address = new Uri(featuresServiceAddress));

builder.Services
    .AddGrpcClient<TaskFeatureLinker.TaskFeatureLinkerClient>(o => o.Address = new Uri(tasksServiceAddress));

builder.Services
    .AddGrpcClient<FeaturePatcher.FeaturePatcherClient>(o => o.Address = new Uri(featuresServiceAddress));

builder.Services
    .AddGrpcClient<FeatureStagePatcher.FeatureStagePatcherClient>(o => o.Address = new Uri(featuresServiceAddress));

var app = builder.Build();

// TODO: add rate limiting on /api/auth/* endpoints to prevent brute-force attacks (AddRateLimiter + fixed-window policy)
app.UseMiddleware<GrpcExceptionMiddleware>();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

namespace OneMoreTaskTracker.Api
{
    public partial class Program { }
}
