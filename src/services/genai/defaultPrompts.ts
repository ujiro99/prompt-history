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
