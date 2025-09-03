using System.Collections.Concurrent;
using System.Text;
using System.Text.RegularExpressions;
using KoalaWiki.Core.Extensions;
using KoalaWiki.Domains.DocumentFile;
using KoalaWiki.Prompts;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;

namespace KoalaWiki.KoalaWarehouse.DocumentPending;

public partial class DocumentPendingService
{
    private static int TaskMaxSizePerUser = 3;
    private static int MinContentLength = 1000;
    private static double MinQualityScore = 60.0;
    private static double MinChineseRatio = 0.3;

    static DocumentPendingService()
    {
        // 读取环境变量
        var maxSize = Environment.GetEnvironmentVariable("TASK_MAX_SIZE_PER_USER").GetTrimmedValueOrEmpty();
        if (!string.IsNullOrEmpty(maxSize) && int.TryParse(maxSize, out var maxSizeInt))
        {
            TaskMaxSizePerUser = maxSizeInt;
        }

        // 文档质量相关配置
        var minLength = Environment.GetEnvironmentVariable("DOC_MIN_CONTENT_LENGTH").GetTrimmedValueOrEmpty();
        if (!string.IsNullOrEmpty(minLength) && int.TryParse(minLength, out var lengthInt))
        {
            MinContentLength = lengthInt;
        }
        
        var minScore = Environment.GetEnvironmentVariable("DOC_MIN_QUALITY_SCORE").GetTrimmedValueOrEmpty();
        if (!string.IsNullOrEmpty(minScore) && double.TryParse(minScore, out var scoreDouble))
        {
            MinQualityScore = scoreDouble;
        }
    }

    /// <summary>
    /// 处理文档生成
    /// </summary>
    /// <param name="documents"></param>
    /// <param name="fileKernel"></param>
    /// <param name="catalogue"></param>
    /// <param name="gitRepository"></param>
    /// <param name="warehouse"></param>
    /// <param name="path"></param>
    /// <param name="dbContext"></param>
    /// <param name="classifyType">
    /// 分类类型
    /// </param>
    /// <exception cref="Exception"></exception>
    public static async Task HandlePendingDocumentsAsync(List<DocumentCatalog> documents, Kernel fileKernel,
        string catalogue,
        string gitRepository, Warehouse warehouse, string path, IKoalaWikiContext dbContext, ClassifyType? classifyType)
    {
        // 提供5个并发的信号量,很容易触发429错误
        var semaphore = new SemaphoreSlim(TaskMaxSizePerUser);

        // 等待中的任务列表
        var pendingDocuments = new ConcurrentBag<DocumentCatalog>(documents);
        var runningTasks = new List<Task<(DocumentCatalog catalog, DocumentFileItem fileItem, List<string> files)>>();

        // 开始处理文档，直到所有文档都处理完成
        while (pendingDocuments.Count > 0 || runningTasks.Count > 0)
        {
            // 尝试启动新任务，直到达到并发限制
            while (pendingDocuments.Count > 0 && runningTasks.Count < TaskMaxSizePerUser)
            {
                if (!pendingDocuments.TryTake(out var documentCatalog)) continue;

                var task = ProcessDocumentAsync(documentCatalog, fileKernel, catalogue, gitRepository,
                    warehouse.Branch, path, semaphore, classifyType);
                runningTasks.Add(task);

                // 这里使用了一个小的延迟来避免过于频繁的任务启动
                await Task.Delay(1000, CancellationToken.None);
            }

            // 如果没有正在运行的任务，退出循环
            if (runningTasks.Count == 0)
                break;

            // 等待任意一个任务完成
            var completedTask = await Task.WhenAny(runningTasks);
            runningTasks.Remove(completedTask);

            try
            {
                var (catalog, fileItem, files) = await completedTask;

                if (fileItem == null)
                {
                    // 构建失败
                    Log.Logger.Error("处理仓库；{path} ,处理标题：{name} 失败:文件内容为空", path, catalog.Name);
                    throw new Exception("处理失败，文件内容为空: " + catalog.Name);
                }

                // 最终质量验证（双重保障）
                var (isQualityValid, qualityMessage, finalMetrics) =
                    ValidateDocumentQuality(fileItem.Content, catalog.Name);
                if (!isQualityValid && finalMetrics.QualityScore < (MinQualityScore * 0.8)) // 最终验证标准稍微宽松一些
                {
                    Log.Logger.Error("处理仓库；{path} ,处理标题：{name} 失败:文档质量不达标 - {message}, 评分: {score}",
                        path, catalog.Name, qualityMessage, finalMetrics.QualityScore);
                    throw new Exception($"处理失败，文档质量不达标: {catalog.Name}, 详情: {qualityMessage}");
                }

                // 更新文档状态
                await dbContext.DocumentCatalogs.Where(x => x.Id == catalog.Id)
                    .ExecuteUpdateAsync(x => x.SetProperty(y => y.IsCompleted, true));

                // 修复Mermaid语法错误
                RepairMermaid(fileItem);

                await dbContext.DocumentFileItems.AddAsync(fileItem);

                await dbContext.DocumentFileItemSources.AddRangeAsync(files.Select(x => new DocumentFileItemSource()
                {
                    Address = x,
                    DocumentFileItemId = fileItem.Id,
                    Name = Path.GetFileName(x),
                    CreatedAt = DateTime.Now,
                    Id = Guid.NewGuid().ToString("N"),
                }));

                await dbContext.SaveChangesAsync();

                Log.Logger.Information("处理仓库；{path}, 处理标题：{name} 完成并保存到数据库！", path, catalog.Name);
            }
            catch (Exception ex)
            {
                Log.Logger.Error("处理文档失败: {ex}", ex.ToString());
            }
        }
    }

    /// <summary>
    /// 处理单个文档的异步方法
    /// <returns>
    /// 返回列表
    /// </returns>
    /// </summary>
    public static async Task<(DocumentCatalog catalog, DocumentFileItem fileItem, List<string> files)>
        ProcessDocumentAsync(DocumentCatalog catalog, Kernel kernel, string catalogue, string gitRepository,
            string branch,
            string path,
            SemaphoreSlim? semaphore, ClassifyType? classifyType)
    {
        int retryCount = 0;
        const int retries = 5;
        var files = new List<string>();

        while (true)
        {
            try
            {
                if (semaphore != null)
                {
                    await semaphore.WaitAsync();
                }

                Log.Logger.Information("处理仓库；{path} ,处理标题：{name}", path, catalog.Name);
                var fileItem = await ProcessCatalogueItems(catalog, catalogue, gitRepository, branch, path,
                    classifyType, files);
                // ProcessCatalogueItems内部已经进行了质量验证，这里只做最终检查
                if (fileItem == null)
                {
                    throw new InvalidOperationException("文档生成失败：返回内容为空");
                }

                Log.Logger.Information("处理仓库；{path} ,处理标题：{name} 完成！", path, catalog.Name);
                semaphore?.Release();

                return (catalog, fileItem, files);
            }
            catch (Exception ex)
            {
                Log.Logger.Error("处理仓库；{path} ,处理标题：{name} 失败:{ex}", path, catalog.Name, ex.ToString());
                semaphore?.Release();

                retryCount++;
                if (retryCount >= retries)
                {
                    Console.WriteLine($"处理 {catalog.Name} 失败，已重试 {retryCount} 次，错误：{ex.Message}");
                    throw; // 重试耗尽后向上层抛出异常
                }
                else
                {
                    // 根据异常类型决定等待时间
                    int delayMs;
                    if (ex is InvalidOperationException && ex.Message.Contains("文档质量"))
                    {
                        // 质量问题重试间隔较短，因为主要是内容生成问题
                        delayMs = 5000 * retryCount;
                        Log.Logger.Information("文档质量问题重试 - 仓库: {path}, 标题: {name}, 第{retry}次重试, 等待{delay}ms",
                            path, catalog.Name, retryCount, delayMs);
                    }
                    else
                    {
                        // API限流等其他问题需要更长等待时间
                        delayMs = 10000 * retryCount;
                        Log.Logger.Information("API异常重试 - 仓库: {path}, 标题: {name}, 第{retry}次重试, 等待{delay}ms",
                            path, catalog.Name, retryCount, delayMs);
                    }

                    await Task.Delay(delayMs);
                }
            }
        }
    }


    /// <summary>
    /// 处理每一个标题产生文件内容
    /// </summary>
    private static async Task<DocumentFileItem> ProcessCatalogueItems(DocumentCatalog catalog,
        string codeFiles,
        string gitRepository, string branch, string path, ClassifyType? classify, List<string> files)
    {
        DocumentContext.DocumentStore = new DocumentStore();

        var docs = new DocsFunction();
        // 为每个文档处理创建独立的Kernel实例，避免状态管理冲突
        var documentKernel = KernelFactory.GetKernel(
            OpenAIOptions.Endpoint,
            OpenAIOptions.ChatApiKey,
            path,
            OpenAIOptions.ChatModel,
            false, // 文档生成不需要代码分析功能
            files, (builder => { builder.Plugins.AddFromObject(docs,"Docs"); })
        );

        var chat = documentKernel.Services.GetService<IChatCompletionService>();

        string prompt = await
            GetDocumentPendingPrompt(classify, codeFiles, gitRepository, branch, catalog.Name, catalog.Prompt);

        var history = new ChatHistory();

        history.AddSystemEnhance();

        var contents = new ChatMessageContentItemCollection
        {
            new TextContent(prompt),
            new TextContent(Prompt.Language)
        };

        contents.AddDocsGenerateSystemReminder();
        history.AddUserMessage(contents);

        var sr = new StringBuilder();

        var settings = new OpenAIPromptExecutionSettings()
        {
            ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions,
            MaxTokens = DocumentsHelper.GetMaxTokens(OpenAIOptions.ChatModel),
        };

        int count = 1;

        reset:

        await foreach (var i in chat.GetStreamingChatMessageContentsAsync(history, settings, documentKernel))
        {
            if (!string.IsNullOrEmpty(i.Content))
            {
                sr.Append(i.Content);
            }
        }

        if (string.IsNullOrEmpty(docs.Content) && count < 5)
        {
            count++;
            goto reset;
        }

        // 先进行基础质量验证，避免对质量过差的内容进行精炼
        var (isInitialValid, initialMessage, initialMetrics) = ValidateDocumentQuality(docs.Content, catalog.Name);

        if (!isInitialValid)
        {
            Log.Logger.Warning("初始内容质量验证失败，跳过精炼 - 标题: {name}, 原因: {message}, 评分: {score}",
                catalog.Name, initialMessage, initialMetrics.QualityScore);

            // 如果内容质量太差，直接抛出异常重新生成，不进行精炼
            if (initialMetrics.ContentLength < 500)
            {
                throw new InvalidOperationException($"初始内容质量过差，需要重新生成: {initialMessage}");
            }
        }
        else
        {
            Log.Logger.Information("初始内容质量验证通过 - 标题: {name}, 评分: {score}",
                catalog.Name, initialMetrics.QualityScore);
        }

        if (DocumentOptions.RefineAndEnhanceQuality && isInitialValid)
        {
            try
            {
                var refineContents = new ChatMessageContentItemCollection
                {
                    new TextContent(
                        """
                        Please refine and enhance the previous documentation content while maintaining its structure and approach. Focus on:

                        **Enhancement Areas:**
                        - Deepen existing architectural explanations with more technical detail
                        - Expand code analysis with additional insights from the repository
                        - Strengthen existing Mermaid diagrams with more comprehensive representations
                        - Improve clarity and readability of existing explanations
                        - Add more specific code references and examples where appropriate
                        - Enhance existing sections with additional technical depth

                        **Quality Standards:**
                        - Maintain the 90-10 description-to-code ratio established in the original
                        - Ensure all additions are evidence-based from the actual code files
                        - Preserve the Microsoft documentation style approach
                        - Enhance conceptual understanding through improved explanations
                        - Strengthen the progressive learning structure

                        **Refinement Protocol (tools only):**
                        1) Use Docs.Read to review the current document thoroughly.
                        2) Plan improvements that preserve structure and voice.
                        3) Apply multiple small, precise Docs.Edit operations to improve clarity, add missing details, and strengthen diagrams/citations.
                        4) After each edit, re-run Docs.Read to verify changes and continue iterating (at least 2–3 passes).
                        5) Avoid full overwrites; prefer targeted edits that enhance existing content.

                        Build upon the solid foundation that exists to create even more comprehensive and valuable documentation.
                        """),
                    new TextContent(
                        """
                        <system-reminder>
                        CRITICAL: You are now in document refinement phase. Your task is to ENHANCE and IMPROVE the EXISTING documentation content that was just generated, NOT to create completely new content.

                        MANDATORY REQUIREMENTS:
                        1. PRESERVE the original document structure and organization
                        2. ENHANCE existing explanations with more depth and clarity
                        3. IMPROVE technical accuracy and completeness based on actual code analysis
                        4. EXPAND existing sections with more detailed architectural analysis
                        5. REFINE language for better readability while maintaining technical precision
                        6. STRENGTHEN existing Mermaid diagrams or add complementary ones
                        7. ENSURE all enhancements are based on the code files analyzed in the original generation

                        FORBIDDEN ACTIONS:
                        - Do NOT restructure or reorganize the document completely
                        - Do NOT remove existing sections or content
                        - Do NOT add content not based on the analyzed code files
                        - Do NOT change the fundamental approach or style established in the original

                        Your goal is to take the good foundation that exists and make it BETTER, MORE DETAILED, and MORE COMPREHENSIVE while preserving its core structure and insights.
                        </system-reminder>
                        """),
                    new TextContent(Prompt.Language)
                };
                history.AddUserMessage(refineContents);

                var refinedContent = new StringBuilder();
                int reset1 = 1;
                reset1:
                await foreach (var item in chat.GetStreamingChatMessageContentsAsync(history, settings, documentKernel))
                {
                    if (!string.IsNullOrEmpty(item.Content))
                    {
                        refinedContent.Append(item.Content);
                    }
                }

                if (string.IsNullOrEmpty(docs.Content) && reset1 < 3)
                {
                    reset1++;
                    goto reset1;
                }

                // 检查精炼后的内容是否有效
                if (!string.IsNullOrWhiteSpace(refinedContent.ToString()))
                {
                    sr.Clear();
                    sr.Append(refinedContent.ToString());
                    Log.Logger.Information("文档精炼成功，文档：{name}", catalog.Name);
                }
                else
                {
                    Log.Logger.Warning("文档精炼后内容为空，使用原始内容，文档：{name}", catalog.Name);
                }
            }
            catch (Exception ex)
            {
                Log.Logger.Error("文档精炼失败，使用原始内容，文档：{name}，错误：{error}", catalog.Name, ex.Message);
                // sr已经包含原始内容，无需额外操作
            }
        }


        var fileItem = new DocumentFileItem()
        {
            Content = docs.Content,
            DocumentCatalogId = catalog.Id,
            Description = string.Empty,
            Extra = new Dictionary<string, string>(),
            Metadata = new Dictionary<string, string>(),
            Source = [],
            CommentCount = 0,
            RequestToken = 0,
            CreatedAt = DateTime.Now,
            Id = Guid.NewGuid().ToString("N"),
            ResponseToken = 0,
            Size = 0,
            Title = catalog.Name,
        };

        return fileItem;
    }

    /// <summary>
    /// 验证文档质量是否符合标准
    /// </summary>
    /// <param name="content">文档内容</param>
    /// <param name="title">文档标题</param>
    /// <returns>验证结果和详细信息</returns>
    public static (bool IsValid, string ValidationMessage, DocumentQualityMetrics Metrics) ValidateDocumentQuality(
        string content, string title)
    {
        var metrics = new DocumentQualityMetrics();
        var validationIssues = new List<string>();

        try
        {
            // 1. 基础长度验证
            metrics.ContentLength = content?.Length ?? 0;
            if (metrics.ContentLength < MinContentLength)
            {
                validationIssues.Add($"文档内容过短: {metrics.ContentLength} 字符 (最少需要{MinContentLength}字符)");
            }

            if (string.IsNullOrWhiteSpace(content))
            {
                validationIssues.Add("文档内容为空");
                return (false, string.Join("; ", validationIssues), metrics);
            }

            // 设置整体质量评分
            metrics.QualityScore = CalculateQualityScore(metrics, validationIssues.Count);

            // 如果有严重问题，返回验证失败
            var isValid = validationIssues.Count == 0 || (validationIssues.Count <= 2 && metrics.ContentLength >= 1500);

            var message = validationIssues.Count > 0
                ? $"质量问题: {string.Join("; ", validationIssues)}"
                : "文档质量验证通过";

            Log.Logger.Information("文档质量验证 - 标题: {title}, 质量评分: {score}, 问题数: {issues}",
                title, metrics.QualityScore, validationIssues.Count);

            return (isValid, message, metrics);
        }
        catch (Exception ex)
        {
            Log.Logger.Error(ex, "文档质量验证失败 - 标题: {title}", title);
            return (false, $"质量验证异常: {ex.Message}", metrics);
        }
    }

    /// <summary>
    /// 计算文档质量评分
    /// </summary>
    private static double CalculateQualityScore(DocumentQualityMetrics metrics, int issueCount)
    {
        double score = 100.0;

        // 基于各项指标扣分
        if (metrics.ContentLength < MinContentLength) score -= 20;
        else if (metrics.ContentLength < MinContentLength * 1.5) score -= 10;

        score -= issueCount * 5;

        return Math.Max(score, 0);
    }

    /// <summary>
    /// 文档质量指标
    /// </summary>
    public class DocumentQualityMetrics
    {
        public int ContentLength { get; set; }
        public double QualityScore { get; set; }
    }

    /// <summary>
    /// Mermaid可能存在语法错误，使用大模型进行修复
    /// </summary>
    /// <param name="fileItem"></param>
    public static void RepairMermaid(DocumentFileItem fileItem)
    {
        try
        {
            var regex = new Regex(@"```mermaid\s*([\s\S]*?)```", RegexOptions.Multiline);
            var matches = regex.Matches(fileItem.Content);

            foreach (Match match in matches)
            {
                var code = match.Groups[1].Value;

                // 只需要删除[]里面的(和)，它可能单独处理
                var codeWithoutBrackets =
                    Regex.Replace(code, @"\[[^\]]*\]",
                        m => m.Value.Replace("(", "").Replace(")", "").Replace("（", "").Replace("）", ""));
                // 然后替换原有内容
                fileItem.Content = fileItem.Content.Replace(match.Value, $"```mermaid\n{codeWithoutBrackets}```");
            }
        }
        catch (Exception ex)
        {
            Log.Error(ex, "修复mermaid语法失败");
        }
    }
}
