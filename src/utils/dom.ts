// Utility functions for DOM event handling
export function stopPropagation() {
  return {
    onKeyPress: (e: React.KeyboardEvent) => e.stopPropagation(),
    onKeyUp: (e: React.KeyboardEvent) => e.stopPropagation(),
    onWheel: (e: React.WheelEvent) => e.stopPropagation(),
    onTouchMove: (e: React.TouchEvent) => e.stopPropagation(),
  }
}
