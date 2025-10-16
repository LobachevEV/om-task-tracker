using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using OneMoreTaskTracker.Api.Auth;
using OneMoreTaskTracker.Api.Middleware;
using OneMoreTaskTracker.Proto.Tasks;
using OneMoreTaskTracker.Proto.Tasks.CreateTaskCommand;
using OneMoreTaskTracker.Proto.Tasks.GetTaskQuery;
using OneMoreTaskTracker.Proto.Tasks.ListTasksQuery;
using OneMoreTaskTracker.Proto.Users;

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

builder.Services
    .AddGrpcClient<TaskCreator.TaskCreatorClient>(o => o.Address = new Uri(tasksServiceAddress));

builder.Services
    .AddGrpcClient<TaskLister.TaskListerClient>(o => o.Address = new Uri(tasksServiceAddress));

builder.Services
    .AddGrpcClient<TaskGetter.TaskGetterClient>(o => o.Address = new Uri(tasksServiceAddress));

builder.Services
    .AddGrpcClient<TaskMover.TaskMoverClient>(o => o.Address = new Uri(tasksServiceAddress));

builder.Services
    .AddGrpcClient<UserService.UserServiceClient>(o => o.Address = new Uri(usersServiceAddress));

var app = builder.Build();

// TODO: add rate limiting on /api/auth/* endpoints to prevent brute-force attacks (AddRateLimiter + fixed-window policy)
app.UseMiddleware<GrpcExceptionMiddleware>();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
