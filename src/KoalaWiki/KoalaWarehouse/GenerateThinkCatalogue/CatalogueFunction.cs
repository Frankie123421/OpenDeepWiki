using System.ComponentModel;
using Newtonsoft.Json.Linq;

namespace KoalaWiki.KoalaWarehouse.GenerateThinkCatalogue;

public class CatalogueFunction
{
    [KernelFunction("Write"), Description("""
                                          Generate and store the complete documentation structure JSON.
                                          Usage:
                                          - This tool overwrites the existing catalogue JSON.
                                          - Output MUST be valid JSON following the items/children schema.
                                          - Do NOT wrap JSON in code fences or tags.
                                          - Call this only when the JSON is complete and validated.
                                          - Use emojis only when explicitly requested by the user.
                                          """)]
    public string Write(
        [Description("The complete documentation structure JSON")]
        string json)
    {
        Content = json;
        if (string.IsNullOrWhiteSpace(Content))
        {
            return "<system-reminder>Content cannot be empty.</system-reminder>";
        }

        Content = Content.Trim();


        // Validate JSON integrity after edit
        try
        {
            JToken.Parse(Content);
        }
        catch (Exception exception)
        {
            return
                $"<system-reminder>Write rejected: resulting content is not valid JSON. Provide a more precise edit. Error Message:{exception.Message}</system-reminder>";
        }


        return "<system-reminder>Write successful</system-reminder>";
    }

    [KernelFunction("Read"), Description("""
                                         Read the currently stored catalogue JSON for verification.
                                         Usage:
                                         - Returns the entire stored JSON string.
                                         - If empty, a system reminder is returned.
                                         """)]
    public string Read()
    {
        if (string.IsNullOrWhiteSpace(Content))
        {
            return "<system-reminder>Catalogue is empty. Use Write to store JSON first.</system-reminder>";
        }

        return Content;
    }

    [KernelFunction("Edit"), Description("""
                                         Perform precise string replacement operations in the stored catalogue JSON.
                                         Usage:
                                         - Read current JSON first when needed using `Read`.
                                         - Provide an exact substring to replace; the tool is literal and case-sensitive.
                                         - If the old string is not unique, set `replaceAll=true` or provide a longer unique string.
                                         - The result MUST remain valid JSON or the edit will be rejected.
                                         - Do not add emojis unless explicitly requested by the user.
                                         """)]
    public string Edit(
        [Description("The text to replace")] string oldString,
        [Description("The text to replace it with (must be different from old_string)")]
        string newString,
        [Description("Replace all occurrences of old_string (default false)")]
        bool replaceAll = false)
    {
        if (string.IsNullOrWhiteSpace(Content))
        {
            return "<system-reminder>Catalogue is empty. Write content first.</system-reminder>";
        }

        if (string.IsNullOrEmpty(oldString))
        {
            return "<system-reminder>Old string cannot be empty.</system-reminder>";
        }

        if (oldString == newString)
        {
            return "<system-reminder>New string must be different from old string.</system-reminder>";
        }

        if (!Content!.Contains(oldString))
        {
            return "<system-reminder>Old string not found in catalogue.</system-reminder>";
        }

        if (!replaceAll && Content.Split(new[] { oldString }, StringSplitOptions.None).Length > 2)
        {
            return
                "<system-reminder>Old string is not unique. Use replaceAll=true or provide a longer unique string.</system-reminder>";
        }

        string updated;
        if (replaceAll)
        {
            updated = Content.Replace(oldString, newString);
        }
        else
        {
            var index = Content.IndexOf(oldString, StringComparison.Ordinal);
            updated = Content.Substring(0, index) + newString + Content.Substring(index + oldString.Length);
        }

        // Validate JSON integrity after edit
        try
        {
            JToken.Parse(updated);
        }
        catch (Exception exception)
        {
            return
                $"<system-reminder>Edit rejected: resulting content is not valid JSON. Provide a more precise edit. Error Message:{exception.Message}</system-reminder>";
        }

        Content = updated;
        return "<system-reminder>Edit successful</system-reminder>";
    }

    public string? Content { get; private set; }
}