/**
 * System Instruction (fixed, not user-editable)
 *
 * Defines the AI's role and fundamental rules.
 * This is a fixed prompt that controls the basic behavior of the AI.
 *
 * Note: This system instruction is passed via the
 * config.systemInstruction parameter of GeminiClient.
 * Do not include it in the prompt text.
 */
export const SYSTEM_INSTRUCTION = `You are an expert in prompt engineering and variable abstraction for large language models. You are also a mentor who helps users write better prompts.
Based on the given inputs, design a reusable prompt variable.

CRITICAL RULES:
- You must ONLY output structured JSON in the specified schema
- The explanation field MUST be 400 characters or less
- Output in the same language as the user prompt`

/**
 * Default meta-prompt template
 * This template is used when useDefault is true in settings
 */
export const DEFAULT_META_PROMPT = `# Task
Based on the Input representing the user's request, design reusable prompt variables following the steps below.

# Instruction Steps (CoT)
1. **Understand the purpose:** Identify the elements the user wants to control or reuse from the variable name and purpose.
2. **Analyze history:** Refer to the prompt history and extract recurring themes, tones, and patterns consistent with the user’s requests.
3. **Formulate design policy:** Express and summarize how the variables derived from the user’s purpose and prompt history can make prompt creation more convenient.
4. **Design by type:** Generate candidates according to the variable type.
    - String type: Multiline string representing patterns aligned with the context.
    - Option type: Distinct, non-overlapping choices that are easy for the user to select.
    - Dictionary type: At least three key definitions, each with a multiline string (value) representing its pattern.
5. **Quality check:** Evaluate consistency and practicality of candidates and select the final structure.
6. **Generate explanation:** Create a concise explanation **within 400 characters** from the following perspectives:
    - Which parts of the prompt history were referenced (evoking the user’s own experience)
    - How the variables help the user achieve their goals (creating anticipation for future use)
    - Improve readability with line breaks and bullet points`

/**
 * Input section template
 * This section describes the input variables provided to the AI
 * This is a fixed section included in every meta-prompt
 */
export const INPUT_SECTION = `
# Input
1. Variable name: {{variable_name}}
2. Purpose of the variable: {{variable_purpose}}
3. Variable type: {{variable_type}}
   - Text type: Multiline string directly embedded into the prompt.
   - Select type: Multiple choices selectable by the user during input.
   - Dictionary type: Key-value structure where keys are options and values are multiline strings.
4. Prompt history:
<prompt_history>
{{prompt_history}}
</prompt_history>
`
/**
 * Instruction for existing variable contents
 * This is appended when existing content is provided for merging
 */
export const ADDITION_TO_EXISTING_VARIABLES = `# Existing Variables
The following are existing variable contents.
Please generate new content that does not duplicate these:`

/**
 * Instruction for modifying existing variable contents
 * This is used when the AI is asked to improve existing content
 */
export const MODIFICATION_TO_EXISTING_VARIABLES = `# Existing Variable
The following are existing variable contents.
Please improve the content based on the new input while retaining the original intent:`

/**
 * Instruction for additional user instructions
 * This is appended when the user provides extra instructions
 */
export const ADDITIONAL_INSTRUCTIONS = `# Additional Instructions
Please follow these additional instructions when generating content:`
