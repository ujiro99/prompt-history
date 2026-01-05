/**
 * Variable Generation Service
 * Main entry point for AI-powered variable preset generation
 */

export * from "./core"
export * from "./metaPromptGenerator"
export * from "./promptHistoryFetcher"
export * from "./responseMerger"
export * from "./estimatorService"

// Export service with progress tracking
export { VariableGeneratorService } from "./service"
import { VariableGeneratorService } from "./service"

// Singleton instance for convenience
export const variableGeneratorService = new VariableGeneratorService()
