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
- Focus on improving the structure, clarity, and effectiveness of the prompt itself
- Output in the same language as the user prompt`

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
 * System Instruction (fixed, not user-editable)
 *
 * Defines the AI's role and fundamental rules.
 * Similar to the SYSTEM_INSTRUCTION of Prompt Improver,
 * this is a fixed prompt that controls the basic behavior of the AI.
 *
 * Note: This system instruction is passed via the
 * config.systemInstruction parameter of GeminiClient.
 * Do not include it in the prompt text.
 */
export const SYSTEM_ORGANIZATION_INSTRUCTION = `You are an expert prompt engineering assistant.
Your role is to analyze user's prompt history and create reusable templates.

CRITICAL RULES:
- You must ONLY output structured JSON in the specified schema
- Focus on creating practical, reusable templates
- Output in the same language as the user prompt`

/**
 * Default organization prompt for Prompt Organizer (user-customizable)
 *
 * This prompt defines HOW the AI should analyze and organize prompts into reusable templates.
 * This CAN be customized by users via Prompt Organizer settings.
 */
export const DEFAULT_ORGANIZATION_PROMPT = `Analyze and organize the following user prompts using these guidelines:

Step 1: Cluster similar prompts
1. Cluster prompts based on similarity in content, purpose, tasks, and patterns
2. After clustering, filter only to clusters containing two or more prompts.

Step 2: For each cluster, generate a reusable template:
1. **Pattern Extraction**: Identify common patterns
2. **Variable Identification**: Replace variable parts with {{variable_name}} format
   - Examples: customer_names, dates, numbers, specific content
3. **Template Creation**: Create concise, reusable templates
   - Use the same language as the original prompt.
   - Maintain line breaks, headings, and emphasis formatting.
4. **Title**: Provide a clear title (max 20 chars)
5. **Use Case Definition**: Describe the use case to clarify context and purpose (max 40 chars)
6. **Category Assignment**: Select or suggest appropriate categories

Prioritization:
- Focus on frequently executed prompts
- Prioritize prompts with clear reusability
- Exclude one-time or highly specific prompts`
