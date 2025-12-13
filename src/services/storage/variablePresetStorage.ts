import type {
  VariablePreset,
  StoredVariablePreset,
  Prompt,
  StoredPrompt,
} from "../../types/prompt"
import { variablePresetsStorage, promptsStorage } from "./definitions"
import { generatePromptId } from "../../utils/idGenerator"

/**
 * Convert VariablePreset to StoredVariablePreset for storage
 */
function toStoredPreset(preset: VariablePreset): StoredVariablePreset {
  return {
    ...preset,
    createdAt: preset.createdAt.toISOString(),
    updatedAt: preset.updatedAt.toISOString(),
  }
}

/**
 * Convert StoredVariablePreset to VariablePreset
 */
function fromStoredPreset(stored: StoredVariablePreset): VariablePreset {
  return {
    ...stored,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
  }
}

/**
 * Convert StoredPrompt to Prompt
 */
function fromStoredPrompt(stored: StoredPrompt): Prompt {
  return {
    ...stored,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
    lastExecutedAt: new Date(stored.lastExecutedAt),
  }
}

/**
 * Get all variable presets
 */
export async function getVariablePresets(): Promise<VariablePreset[]> {
  const presets = await variablePresetsStorage.getValue()

  return Object.values(presets).map(fromStoredPreset)
}

/**
 * Save a variable preset (create or update)
 */
export async function saveVariablePreset(
  preset: VariablePreset,
): Promise<void> {
  const updatedPreset: VariablePreset = {
    ...preset,
    updatedAt: new Date(),
  }
  const storedPreset = toStoredPreset(updatedPreset)

  const currentPresets = await variablePresetsStorage.getValue()
  const updatedPresets = {
    ...currentPresets,
    [preset.id]: storedPreset,
  }

  await variablePresetsStorage.setValue(updatedPresets)
}

/**
 * Delete a variable preset
 * Returns list of affected prompt IDs
 * Also converts affected prompt variables from preset type to text type
 */
export async function deleteVariablePreset(id: string): Promise<string[]> {
  const currentPresets = await variablePresetsStorage.getValue()

  if (!currentPresets[id]) {
    throw new Error(`Preset with id ${id} not found`)
  }

  // Find affected prompts
  const affectedPrompts = await findPromptsByPresetId(id)
  const affectedPromptIds = affectedPrompts.map((p) => p.id)

  // Convert preset variables to text type in affected prompts
  if (affectedPrompts.length > 0) {
    const currentPrompts = await promptsStorage.getValue()

    for (const prompt of affectedPrompts) {
      const storedPrompt = currentPrompts[prompt.id]
      if (!storedPrompt || !storedPrompt.variables) continue

      // Convert preset-type variables to text type
      const updatedVariables = storedPrompt.variables.map((variable) => {
        if (variable.type === "preset" && variable.presetId === id) {
          // Convert to text type
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { presetId, ...rest } = variable
          return {
            ...rest,
            type: "text" as const,
          }
        }
        return variable
      })

      // Update prompt with converted variables
      currentPrompts[prompt.id] = {
        ...storedPrompt,
        variables: updatedVariables,
      }
    }

    // Save updated prompts
    await promptsStorage.setValue(currentPrompts)
  }

  // Delete preset
  const { [id]: _, ...remainingPresets } = currentPresets
  await variablePresetsStorage.setValue(remainingPresets)

  return affectedPromptIds
}

/**
 * Duplicate a variable preset
 */
export async function duplicateVariablePreset(
  id: string,
): Promise<VariablePreset> {
  const currentPresets = await variablePresetsStorage.getValue()

  if (!currentPresets[id]) {
    throw new Error(`Preset with id ${id} not found`)
  }

  const original = fromStoredPreset(currentPresets[id])
  const now = new Date()

  // Create new preset with new ID
  const duplicated: VariablePreset = {
    ...original,
    id: generatePromptId(),
    name: `${original.name} (Copy)`,
    createdAt: now,
    updatedAt: now,
  }

  // Duplicate dictionary items with new IDs
  if (duplicated.dictionaryItems) {
    duplicated.dictionaryItems = duplicated.dictionaryItems.map((item) => ({
      ...item,
      id: generatePromptId(),
    }))
  }

  // Save duplicated preset
  await saveVariablePreset(duplicated)

  return duplicated
}

/**
 * Find prompts that use a specific preset
 */
export async function findPromptsByPresetId(
  presetId: string,
): Promise<Prompt[]> {
  const prompts = await promptsStorage.getValue()

  const matchingPrompts: Prompt[] = []

  for (const stored of Object.values(prompts)) {
    const prompt = fromStoredPrompt(stored)

    if (prompt.variables) {
      const hasPresetReference = prompt.variables.some(
        (variable) =>
          variable.type === "preset" && variable.presetId === presetId,
      )

      if (hasPresetReference) {
        matchingPrompts.push(prompt)
      }
    }
  }

  return matchingPrompts
}

/**
 * Export variable presets as JSON
 */
export async function exportVariablePresets(
  presetIds: string[],
): Promise<string> {
  const currentPresets = await variablePresetsStorage.getValue()

  const presetsToExport: StoredVariablePreset[] = []

  for (const id of presetIds) {
    const preset = currentPresets[id]
    if (!preset) {
      throw new Error(`Preset with id ${id} not found`)
    }
    presetsToExport.push(preset)
  }

  return JSON.stringify(presetsToExport, null, 2)
}

/**
 * Import variable presets from JSON
 * @returns Number of imported presets
 */
export async function importVariablePresets(
  jsonData: string,
  mode: "merge" | "replace",
): Promise<number> {
  const presetsToImport = JSON.parse(jsonData) as StoredVariablePreset[]

  if (!Array.isArray(presetsToImport)) {
    throw new Error("Invalid JSON format: expected an array of presets")
  }

  const currentPresets =
    mode === "merge" ? await variablePresetsStorage.getValue() : {}

  const updatedPresets = { ...currentPresets }

  for (const preset of presetsToImport) {
    updatedPresets[preset.id] = preset
  }

  await variablePresetsStorage.setValue(updatedPresets)

  return presetsToImport.length
}
