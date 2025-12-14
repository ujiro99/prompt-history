function moveItemImmutable<T>(array: T[], from: number, to: number): T[] {
  if (from < 0 || from >= array.length) return array
  if (to < 0 || to >= array.length) return array

  const result = [...array]
  const [item] = result.splice(from, 1)
  result.splice(to, 0, item)
  return result
}

export function movePrev<T>(array: T[], index: number): T[] {
  if (index <= 0) return array
  return moveItemImmutable(array, index, index - 1)
}

export function moveNext<T>(array: T[], index: number): T[] {
  if (index >= array.length - 1) return array
  return moveItemImmutable(array, index, index + 1)
}
