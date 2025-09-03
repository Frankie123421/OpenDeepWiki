using System.ComponentModel;

namespace KoalaWiki.Tools;

public class AgentTool
{
    [KernelFunction, Description("""
                                 Use this tool to engage in deep, structured thinking about complex problems, user requirements, or challenging decisions. This tool helps you process information systematically and provides your thought process back to enhance understanding and decision-making.

                                 ## When to Use This Tool
                                 Use this tool proactively in these scenarios:

                                 1. **Complex Problem Analysis** - When facing multi-faceted problems that require careful consideration
                                 2. **Requirement Clarification** - When user requests are ambiguous and need deeper exploration
                                 3. **Decision Points** - When multiple approaches exist and you need to evaluate trade-offs
                                 4. **Architecture Planning** - When designing systems or making technical decisions
                                 5. **Risk Assessment** - When considering potential issues or complications
                                 6. **Learning from Context** - When analyzing existing code or systems to understand patterns

                                 ## Core Thinking Principles

                                 1. **Question Assumptions** - Challenge initial interpretations and explore alternatives
                                 2. **Break Down Complexity** - Decompose complex problems into manageable components
                                 3. **Consider Multiple Perspectives** - Look at problems from different angles
                                 4. **Evaluate Trade-offs** - Weigh pros and cons of different approaches
                                 5. **Anticipate Consequences** - Think through potential implications and side effects
                                 6. **Build on Context** - Use existing knowledge and patterns to inform decisions

                                 ## Thinking Process Structure

                                 Your thought process should follow this pattern:

                                 1. **Initial Understanding** - What is the core problem or requirement?
                                 2. **Context Analysis** - What relevant information do we have?
                                 3. **Assumption Identification** - What assumptions am I making?
                                 4. **Alternative Exploration** - What other approaches could work?
                                 5. **Trade-off Evaluation** - What are the pros and cons of each option?
                                 6. **Decision Rationale** - Why is this the best approach?
                                 7. **Implementation Considerations** - What practical factors matter?
                                 8. **Risk Assessment** - What could go wrong and how to mitigate?

                                 ## Examples of Deep Thinking Scenarios

                                 <example>
                                 User: "I want to add real-time notifications to my app"
                                 Thought Process:
                                 - Initial Understanding: User wants real-time notifications, but what type? Push notifications, in-app notifications, or both?
                                 - Context Analysis: Need to examine existing tech stack, user base size, notification frequency
                                 - Assumptions: Assuming they want both types, but should clarify the specific use cases
                                 - Alternatives: WebSockets, Server-Sent Events, Push API, third-party services
                                 - Trade-offs: WebSockets offer full duplex but require more infrastructure; SSE is simpler but one-way
                                 - Decision: Recommend starting with requirements clarification, then suggest appropriate technology based on their specific needs
                                 - Implementation: Consider scalability, reliability, user preferences
                                 - Risks: Notification fatigue, performance impact, complexity overhead
                                 </example>

                                 <example>
                                 User: "This code is running slowly, can you help optimize it?"
                                 Thought Process:
                                 - Initial Understanding: Performance issue exists, but need to identify bottlenecks
                                 - Context Analysis: Need to examine the code, understand data volumes, usage patterns
                                 - Assumptions: Assuming it's algorithmic complexity, but could be I/O, memory, or network
                                 - Alternatives: Algorithm optimization, caching, database indexing, parallel processing
                                 - Trade-offs: Code complexity vs performance gains, memory usage vs speed
                                 - Decision: Profile first to identify actual bottlenecks before optimizing
                                 - Implementation: Measure performance, implement targeted optimizations
                                 - Risks: Premature optimization, breaking existing functionality, over-engineering
                                 </example>

                                 ## Guidelines for Effective Thinking

                                 1. **Be Thorough** - Don't rush to conclusions; explore the problem space fully
                                 2. **Stay Objective** - Consider evidence and logic over preferences
                                 3. **Embrace Uncertainty** - It's okay to acknowledge when you need more information
                                 4. **Think Practically** - Consider real-world constraints and limitations
                                 5. **Document Reasoning** - Clearly explain your thought process and rationale
                                 6. **Iterate and Refine** - Be prepared to revise your thinking as new information emerges

                                 The goal is to provide well-reasoned, thoughtful analysis that leads to better outcomes and helps others understand complex problems more clearly.
                                 """)]
    public string DeepThinking(
        [Description(
            "Your structured thought process about the problem, following the thinking framework provided in the tool description. This should be a detailed analysis that explores the problem from multiple angles.")]
        string thought)
    {
        Console.WriteLine("深入思考：\n" + thought);
        return thought;
    }
}