import { analytics } from "#imports"
import type { AnalyticsEvent, AnalyticsParameters } from "./events"

/**
 * Centralized analytics service that wraps WXT analytics module
 * Provides type-safe event tracking with consistent error handling
 */
export class AnalyticsService {
  /**
   * Track an analytics event
   * Errors are caught and logged internally to prevent impact on core functionality
   *
   * @param event - The event name to track
   * @param param - Optional parameters for the event
   */
  async track(
    event: AnalyticsEvent,
    param?: AnalyticsParameters,
  ): Promise<void> {
    try {
      await analytics.track(event, param)
    } catch (error) {
      console.warn("Analytics tracking failed:", error)
    }
  }

  /**
   * Initialize auto-tracking for the given container
   * Should be called once during content script initialization
   *
   * @param container - The HTML element to track
   */
  autoTrack(container: HTMLElement): void {
    try {
      analytics.autoTrack(container)
    } catch (error) {
      console.warn("Analytics auto-tracking initialization failed:", error)
    }
  }

  /**
   * Check if analytics is enabled
   *
   * @returns Promise that resolves to true if analytics is enabled
   */
  async isEnabled(): Promise<boolean> {
    try {
      // Access the enabled property from analytics config
      const enabled = await analytics.enabled?.getValue()
      return enabled ?? false
    } catch (error) {
      console.warn("Failed to check analytics enabled status:", error)
      return false
    }
  }
}

/**
 * Singleton instance of AnalyticsService
 */
export const analyticsService = new AnalyticsService()
