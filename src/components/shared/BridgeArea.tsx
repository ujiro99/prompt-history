import { useState, useEffect, useRef, useCallback } from "react"

type Props = {
  fromElm: HTMLElement
  toElm: HTMLElement
  isHorizontal: boolean
} & React.SVGProps<SVGSVGElement>

type Placement = "top" | "bottom" | "left" | "right"

export const BridgeArea = (props: Props) => {
  const { fromElm, toElm, isHorizontal } = props
  const [_, setRenderTrigger] = useState(0) // State to trigger re-render
  const from = fromElm.getBoundingClientRect()
  const to = toElm.getBoundingClientRect()
  const resizeObserver = useRef<ResizeObserver | null>(null)
  const animationFrameId = useRef<number | null>(null)
  const isMonitoringAnimation = useRef<boolean>(false)
  const lastPositions = useRef<{
    from: DOMRect | null
    to: DOMRect | null
  }>({
    from: null,
    to: null,
  })

  // Function to check if positions have changed
  const checkPositionChange = useCallback(() => {
    const currentFrom = fromElm.getBoundingClientRect()
    const currentTo = toElm.getBoundingClientRect()

    const hasChanged =
      !lastPositions.current.from ||
      !lastPositions.current.to ||
      currentFrom.x !== lastPositions.current.from.x ||
      currentFrom.y !== lastPositions.current.from.y ||
      currentTo.x !== lastPositions.current.to.x ||
      currentTo.y !== lastPositions.current.to.y

    if (hasChanged) {
      lastPositions.current = { from: currentFrom, to: currentTo }
      setRenderTrigger((prev) => prev + 1)
    }
  }, [fromElm, toElm])

  // Animation monitoring function
  const monitorPosition = useCallback(() => {
    if (isMonitoringAnimation.current) {
      checkPositionChange()
      animationFrameId.current = requestAnimationFrame(monitorPosition)
    }
  }, [checkPositionChange])

  // Start animation monitoring
  const startAnimationMonitoring = useCallback(() => {
    if (!isMonitoringAnimation.current) {
      isMonitoringAnimation.current = true
      monitorPosition()
    }
  }, [monitorPosition])

  // Stop animation monitoring
  const stopAnimationMonitoring = useCallback(() => {
    isMonitoringAnimation.current = false
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current)
      animationFrameId.current = null
    }
  }, [])

  useEffect(() => {
    resizeObserver.current = new ResizeObserver(() => {
      setRenderTrigger((prev) => prev + 1)
    })
    resizeObserver.current.observe(fromElm)
    resizeObserver.current.observe(toElm)

    // Animation event listeners
    const animationEvents = ["animationstart", "transitionstart"] as const
    const animationEndEvents = [
      "animationend",
      "transitionend",
      "animationcancel",
      "transitioncancel",
    ] as const

    const handleAnimationStart = () => startAnimationMonitoring()
    const handleAnimationEnd = () => stopAnimationMonitoring()

    // Add event listeners to both elements
    animationEvents.forEach((event) => {
      fromElm.addEventListener(event, handleAnimationStart)
      toElm.addEventListener(event, handleAnimationStart)
    })

    animationEndEvents.forEach((event) => {
      fromElm.addEventListener(event, handleAnimationEnd)
      toElm.addEventListener(event, handleAnimationEnd)
    })

    return () => {
      if (resizeObserver.current) {
        resizeObserver.current.disconnect()
      }

      // Stop animation monitoring
      stopAnimationMonitoring()

      // Remove event listeners
      animationEvents.forEach((event) => {
        fromElm.removeEventListener(event, handleAnimationStart)
        toElm.removeEventListener(event, handleAnimationStart)
      })

      animationEndEvents.forEach((event) => {
        fromElm.removeEventListener(event, handleAnimationEnd)
        toElm.removeEventListener(event, handleAnimationEnd)
      })
    }
  }, [fromElm, toElm, startAnimationMonitoring, stopAnimationMonitoring])

  if (!from || !to) {
    return null
  }

  // SVG size and position
  const x = Math.min(from.x, to.x)
  const y = Math.min(from.y, to.y)
  const width = Math.max(from.right, to.right) - x
  const height = Math.max(from.bottom, to.bottom) - y

  // from placement
  const isTop = !isHorizontal && from.y <= to.y
  const isBottom = !isHorizontal && from.bottom >= to.bottom
  const isLeft = isHorizontal && from.x <= to.x
  const placement: Placement = isTop
    ? "top"
    : isBottom
      ? "bottom"
      : isLeft
        ? "left"
        : "right"

  let top = 0
  let left = 0
  let d

  switch (placement) {
    case "top":
      d = `M ${from.right} ${from.top}
         v ${from.height / 4}
         Q ${from.right} ${to.top},
           ${to.right} ${to.top}
         h ${-to.width}
         Q ${from.x} ${to.top},
           ${from.x} ${from.top}
         h ${from.width}
         z`
      top = from.top - to.top
      break
    case "bottom":
      d = `M ${from.left} ${from.bottom}
         Q ${from.left} ${to.bottom},
           ${to.left} ${to.bottom}
         h ${to.width}
         Q ${from.right} ${to.bottom},
           ${from.right} ${from.bottom - from.height / 4}
         v ${from.height / 4}
         h ${-from.width}
         z`
      break
    case "left":
      d = `M ${from.right - from.width / 5} ${from.y}
         Q ${to.x} ${from.y},
           ${to.x} ${to.y}
         v ${to.height}
         Q ${to.x} ${from.bottom},
           ${from.right - from.width / 5} ${from.bottom}
         h ${from.width / 5 - 4}
         v ${-from.height}
         h ${-from.width / 5}
         z`
      left = -from.width - 6
      break
    case "right":
      d = `M ${from.x + from.width / 5} ${from.top}
         Q ${to.right} ${from.top},
           ${to.right} ${to.top}
         v ${to.height}
         Q ${to.right} ${from.bottom},
           ${from.x + from.width / 5} ${from.bottom}
         h ${-from.width / 5 + 4}
         v ${-from.height}
         z`
      left = left - 2
      break
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`${x} ${y} ${width} ${height}`}
      className={props.className}
      style={{
        pointerEvents: "none",
        position: "absolute",
        top,
        left,
      }}
    >
      <path
        d={d}
        fill={"skyblue"}
        fillOpacity="0"
        style={{ pointerEvents: "auto" }}
      />
    </svg>
  )
}
BridgeArea.displayName = "BridgeArea"
