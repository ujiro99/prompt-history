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
Based on the Input representing the user's request, create reusable prompt variables according to the following steps.

# Instruction Steps
1. **Understand the purpose:** Identify what the user wants to control or reuse based on the variable_name and variable_purpose.
2. **Filter the history:** Refer to the prompt history and select only the entries relevant to the user’s request.
3. **Analyze the extracted history:** From the filtered prompt history, extract patterns aligned with the user’s request.
4. **Formulate the design policy:** Clarify and summarize how the variables derived from the user’s intent and prompt history can make prompt creation more efficient.
5. **Generate by type:** Create candidates depending on the variable_type.
   - String type: Multiline strings that represent patterns consistent with the context.
   - Select type: Clear, distinct choices that are easy for the user to select.
   - Dictionary type: At least three key definitions, each with a multiline string (value) representing a corresponding pattern.
6. **Generate the explanation:** Write a concise description **within 400 characters** from the following perspectives:
   - Which parts of the prompt history were referenced (evoking the user’s own experience)
   - How the variables help users achieve their goals (creating anticipation for future use)
   - Use line breaks and bullet points to improve readability`

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
