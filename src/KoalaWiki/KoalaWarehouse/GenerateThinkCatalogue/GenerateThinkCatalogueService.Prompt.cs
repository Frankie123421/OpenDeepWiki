using KoalaWiki.Prompts;

namespace KoalaWiki.KoalaWarehouse.GenerateThinkCatalogue;

public partial class GenerateThinkCatalogueService
{
    public static async Task<string> GenerateThinkCataloguePromptAsync(ClassifyType? classifyType,
        string catalogue, int attemptNumber)
    {
        var projectType = GetProjectTypeDescription(classifyType);
        var basePrompt = await PromptContext.Warehouse(nameof(PromptConstant.Warehouse.AnalyzeCatalogue),
            new KernelArguments()
            {
                ["code_files"] = catalogue,
                ["projectType"] = projectType,
                ["language"] = Prompt.Language
            }, OpenAIOptions.AnalysisModel);

        var toolUsage = "\n\nTOOL USAGE (DocsFunction-style):\n" +
                        "- CORE CODE FIRST: Use File.Glob to list core files (entry points, configuration/DI, services, controllers, models, routes, build scripts), then use File.Read to inspect them BEFORE any catalogue generation.\n" +
                        "- Use Catalogue.Write to persist the initial documentation_structure JSON.\n" +
                        "- Perform 2–3 refinement passes using Catalogue.Read + Catalogue.Edit to: add subsections, deepen hierarchy, and enrich 'prompt' fields.\n" +
                        "- If a major restructure is needed, rewrite the entire JSON via Catalogue.Write.\n" +
                        "- Do NOT print or echo JSON in chat; use tools only.\n" +
                        "- JSON MUST be valid, follow items/children schema, titles in kebab-case, top-level 'getting-started' then 'deep-dive'.\n" +
                        "- Do NOT wrap JSON with code fences or XML/HTML tags.";

        // Attempt-based reinforcement aligned with AnalyzeCatalogue.md output contract
        var enhancementLevel = Math.Min(attemptNumber, 3);
        var enhancement = enhancementLevel switch
        {
            0 =>
                "\n\nPass 1: Create minimal valid JSON and SAVE using Catalogue.Write. Include 'getting-started' and 'deep-dive' with essential children. Kebab-case titles; no fences/tags.",
            1 =>
                "\n\nPass 2: Use Catalogue.Read then Catalogue.Edit to DEEPEN the structure: add Level 2/3 subsections for core components, features, data models, and integrations. Keep ordering and naming consistent. Prefer localized, incremental edits rather than full rewrites.",
            2 =>
                "\n\nPass 3: Use Catalogue.Read/Edit to ENRICH each section's 'prompt' with actionable writing guidance: scope, code areas to analyze, expected outputs. Avoid duplication.",
            _ =>
                "\n\nIf still incomplete: perform targeted Edit operations to fix remaining gaps. Only rewrite via Catalogue.Write if necessary. Ensure final JSON is valid and comprehensive."
        };

        return toolUsage + basePrompt + enhancement;
    }


    private static string GetProjectTypeDescription(ClassifyType? classifyType)
    {
        if (classifyType == ClassifyType.Applications)
        {
            return """
                   ## Application System
                   Focus on application-specific documentation needs:
                   - **Getting Started**: Business purpose, quick setup, basic usage patterns
                   - **Deep Dive**: System architecture, core features, technical implementation, integration points
                   Emphasize user workflows, business logic, and deployment considerations.
                   """;
        }

        if (classifyType == ClassifyType.Frameworks)
        {
            return """
                   ## Development Framework
                   Focus on framework-specific documentation needs:
                   - **Getting Started**: Framework purpose, quick setup, basic concepts, simple examples
                   - **Deep Dive**: Architecture patterns, extensibility mechanisms, API design, performance optimization
                   Emphasize developer experience, plugin systems, and integration workflows.
                   """;
        }

        if (classifyType == ClassifyType.Libraries)
        {
            return """
                   ## Reusable Code Library
                   Focus on library-specific documentation needs:
                   - **Getting Started**: Library purpose, installation, basic usage, common examples
                   - **Deep Dive**: API design, advanced features, performance characteristics, customization options
                   Emphasize practical usage patterns, integration strategies, and version compatibility.
                   """;
        }

        if (classifyType == ClassifyType.DevelopmentTools)
        {
            return """
                   ## Development Tool
                   Focus on tool-specific documentation needs:
                   - **Getting Started**: Tool purpose, installation, basic configuration, first workflow
                   - **Deep Dive**: Advanced features, customization options, integration patterns, optimization techniques
                   Emphasize practical workflows, automation capabilities, and IDE integration.
                   """;
        }

        if (classifyType == ClassifyType.CLITools)
        {
            return """
                   ## Command-Line Interface Tool
                   Focus on CLI-specific documentation needs:
                   - **Getting Started**: Tool purpose, installation, basic commands, common workflows
                   - **Deep Dive**: Command reference, advanced usage, scripting integration, configuration options
                   Emphasize command syntax, automation capabilities, and pipeline integration.
                   """;
        }

        if (classifyType == ClassifyType.DevOpsConfiguration)
        {
            return """
                   ## DevOps & Infrastructure Configuration
                   Focus on DevOps-specific documentation needs:
                   - **Getting Started**: Infrastructure purpose, basic setup, deployment workflow, monitoring basics
                   - **Deep Dive**: Advanced automation, security configuration, scaling strategies, operational procedures
                   Emphasize deployment patterns, infrastructure as code, and operational excellence.
                   """;
        }

        if (classifyType == ClassifyType.Documentation)
        {
            return """
                   ## Documentation & Testing Project
                   Focus on documentation-specific needs:
                   - **Getting Started**: Project purpose, content overview, contribution basics, style guidelines
                   - **Deep Dive**: Content architecture, testing methodologies, maintenance procedures, quality standards
                   Emphasize content organization, quality assurance, and contributor workflows.
                   """;
        }

        return """
               ## General Project Analysis
               Focus on general project documentation needs:
               - **Getting Started**: Project purpose, setup instructions, basic concepts, common usage
               - **Deep Dive**: System architecture, core features, technical implementation, advanced customization
               Provide comprehensive coverage balancing accessibility with technical depth.
               """;
    }
}
