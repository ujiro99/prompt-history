import React, { useMemo } from "react"

type FadeInTextProps = {
  text: string
  stepMs?: number
  delay?: number
  className?: string
}

export const FadeInText: React.FC<FadeInTextProps> = ({
  text,
  stepMs = 10,
  delay = 0,
  className,
}) => {
  const chars = useMemo(() => [...text], [text])

  return (
    <div className={className}>
      {chars.map((ch, i) => (
        <span
          key={i}
          className="inline-block opacity-0 animate-fade-in"
          style={{
            animationDelay: `${delay + i * stepMs}ms`,
          }}
        >
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </div>
  )
}
