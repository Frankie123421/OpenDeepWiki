using ImageAgent.Feishu;
using KoalaWiki.BackendService;
using KoalaWiki.Generate;
using KoalaWiki.KoalaWarehouse.Extensions;
using KoalaWiki.Mem0;
using KoalaWiki.Options;
using KoalaWiki.Services;
using KoalaWiki.Services.Feishu.Feishu;
using OpenDeepWiki.CodeFoundation;

AppContext.SetSwitch("Microsoft.SemanticKernel.Experimental.GenAI.EnableOTelDiagnosticsSensitive", true);

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console()
    .CreateLogger();

#region Dynamic Configuration

// 注册动态配置服务
builder.Services.AddScoped<DynamicConfigService>();
builder.Services.AddScoped<DynamicOptionsManager>();

// 临时初始化JWT配置（保持向后兼容）
var jwtOptions = JwtOptions.InitConfig(builder.Configuration);
builder.Services.AddSingleton(jwtOptions);

// 为了向后兼容，仍然保留静态初始化作为回退
// 这些值会在应用启动后被动态配置覆盖
OpenAIOptions.InitConfig(builder.Configuration);
GithubOptions.InitConfig(builder.Configuration);
GiteeOptions.InitConfig(builder.Configuration);
DocumentOptions.InitConfig(builder.Configuration);
FeishuOptions.InitConfig(builder.Configuration);

#endregion

// 设置文件上传大小
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 1024 * 1024 * OpenAIOptions.MaxFileLimit; // 10MB
});

builder.WebHost.UseKestrel((options =>
{
    options.Limits.MaxRequestBodySize = 1024 * 1024 * OpenAIOptions.MaxFileLimit; // 10MB
}));

builder.Services.AddHttpContextAccessor();
builder.Services.AddKoalaMcp();
builder.Services.AddSerilog(Log.Logger);

builder.Services.AddOpenApi();
builder.Services.AddFastApis();
builder.Services.AddSingleton<GitService>();

// 添加文档处理管道架构
builder.Services.AddDocumentProcessingPipeline();

builder.Services.AddTransient<GlobalMiddleware>();
builder.Services.AddScoped<IUserContext, UserContext>();
builder.Services.AddMemoryCache();

builder.Services.AddHostedService<StatisticsBackgroundService>();
builder.Services.AddHostedService<MiniMapBackgroundService>();

// 添加访问日志队列和后台处理服务
builder.Services.AddSingleton<AccessLogQueue>();
builder.Services.AddHostedService<AccessLogBackgroundService>();

builder.Services.AddScoped<TranslateService>();

builder.Services.AddTransient<FeiShuClient>();
builder.Services.AddHostedService<FeishuStore>();
builder.Services.AddTransient<FeishuHttpClientHandler>();

builder.Services.AddHttpClient("FeiShu")
    .ConfigureHttpClient((client) =>
    {
        client.Timeout = TimeSpan.FromSeconds(600);
        client.DefaultRequestHeaders.Add("User-Agent", "OpenDeepWiki");
        client.DefaultRequestVersion = new Version(2, 0);
        client.DefaultRequestHeaders.Add("Accept", "application/json");
    }).AddHttpMessageHandler<FeishuHttpClientHandler>();

// 添加JWT认证
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
}).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtOptions.Issuer,
        ValidAudience = jwtOptions.Audience,
        IssuerSigningKey = jwtOptions.GetSymmetricSecurityKey(),
        ClockSkew = TimeSpan.Zero
    };

    // 添加事件处理器以支持从cookie中读取token
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            // 首先检查Authorization header
            var token = context.Request.Headers["Authorization"]
                .FirstOrDefault()?.Split(" ").Last();

            // 如果Authorization header中没有token，则检查cookie
            if (string.IsNullOrEmpty(token))
            {
                token = context.Request.Cookies["token"];
            }

            // 如果找到token，则设置到context中
            if (!string.IsNullOrEmpty(token))
            {
                context.Token = token;
            }

            return Task.CompletedTask;
        }
    };
});


// 添加授权策略
builder.Services.AddAuthorizationBuilder()
    // 添加授权策略
    .AddPolicy("RequireAdminRole", policy => policy.RequireRole("admin"))
    // 添加授权策略
    .AddPolicy("RequireUserRole", policy => policy.RequireRole("user", "admin"));

builder.Services
    .AddCors(options =>
    {
        options.AddPolicy("AllowAll", configurePolicy => configurePolicy
            .SetIsOriginAllowed(_ => true)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
    });

builder.Services.AddHostedService<WarehouseTask>();
builder.Services.AddHostedService<WarehouseProcessingTask>();
builder.Services.AddHostedService<DataMigrationTask>();
builder.Services.AddHostedService<Mem0Rag>();

builder.Services.AddDbContext(builder.Configuration);

builder.Services.AddMapster();

builder.Services.AddHttpClient("KoalaWiki", client =>
{
    client.DefaultRequestHeaders.Add("Accept", "application/json");
    client.DefaultRequestHeaders.Add("User-Agent", "KoalaWiki");
});

var app = builder.Build();

app.MapDefaultEndpoints();

// 添加自动迁移代码
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<IKoalaWikiContext>();
    await dbContext.RunMigrateAsync();

    // 初始化动态配置系统
    try
    {
        var dynamicOptionsManager = scope.ServiceProvider.GetRequiredService<DynamicOptionsManager>();
        await dynamicOptionsManager.InitializeAsync();
        Log.Information("动态配置系统初始化成功");
    }
    catch (Exception ex)
    {
        Log.Error(ex, "动态配置系统初始化失败，使用静态配置作为回退");
        // 如果动态配置初始化失败，继续使用静态配置
    }
}

// 添加中间件
app.UseSerilogRequestLogging();

app.UseCors("AllowAll");

// 添加静态文件服务
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

// 添加访问记录中间件（在认证授权之后，业务逻辑之前）
app.UseAccessRecord();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.MapMcp("/api/mcp");


app.UseMiddleware<GlobalMiddleware>();

// 添加权限中间件
app.UseMiddleware<PermissionMiddleware>();

app.MapSitemap();

app.MapFastApis();

app.Run();