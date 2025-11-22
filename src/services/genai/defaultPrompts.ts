/**
 * Default Prompts for Prompt Improvement
 *
 * This file contains the default prompts used by the Prompt Improver service.
 * These prompts are separated for transparency and easy reference.
 */

/**
 * Fixed system prompt (defines AI's role and critical rules)
 *
 * This defines the fundamental role of the AI and critical rules it must follow.
 * This is NOT user-configurable and remains fixed to ensure consistent behavior.
 *
 * Key responsibilities:
 * - Define the AI's identity as a prompt engineering assistant
 * - Establish critical rules to prevent direct answers
 * - Focus on prompt improvement rather than answering questions
 */
export const SYSTEM_INSTRUCTION = `You are an expert prompt engineering assistant.
Your role is to improve user prompts to make them more effective.

CRITICAL RULES:
- You must ONLY output the improved prompt
- Do NOT answer the user's question directly
- Do NOT add explanations or preambles
- Focus on improving the structure, clarity, and effectiveness of the prompt itself`

/**
 * Default improvement prompt (fallback)
 *
 * These propmt define HOW the AI should improve prompts.
 * This CAN be customized by users via settings (text input or URL).
 */
export const DEFAULT_IMPROVEMENT_PROMPT = `Analyze and improve the following user prompt using these guidelines:

1. Maintain the original intent and purpose
2. Clarify any ambiguous expressions
3. Add appropriate structure (bullets, sections, XML tags)
4. Consider adding: persona, constraints, examples, or output format specifications
5. Keep the improved prompt concise and focused

Apply improvements based on the prompt's characteristics (simple/complex, technical/general).`

/**
 * Default organization prompt for Prompt Organizer
 *
 * This prompt defines HOW the AI should analyze and organize prompts into reusable templates.
 * This CAN be customized by users via Prompt Organizer settings.
 */
export const DEFAULT_ORGANIZATION_PROMPT = `Analyze the following prompts and generate reusable templates.

Step 1: Cluster similar prompts
- Group prompts by similarity in content, purpose, and patterns
- Identify common themes and use cases across prompts

Step 2: For each cluster, generate a reusable template:
1. Extract common patterns and create a generalized template with variables
2. Use {{variableName}} syntax for placeholders
3. Provide a clear title (max 20 chars)
4. Describe the use case to clarify context and purpose (max 40 chars)
5. Assign to an appropriate category
6. List all variables with descriptions`
