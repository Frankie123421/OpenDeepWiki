namespace KoalaWiki.Tools;

public class ToolResultInterceptor : IFunctionInvocationFilter
{
    public async Task OnFunctionInvocationAsync(FunctionInvocationContext context,
        Func<FunctionInvocationContext, Task> next)
    {
        await next(context);
    }
}