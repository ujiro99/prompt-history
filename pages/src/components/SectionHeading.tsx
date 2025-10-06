interface SectionHeadingProps {
  children: React.ReactNode
  className?: string
}

export function SectionHeading({
  children,
  className = "",
}: SectionHeadingProps) {
  return (
    <h3
      className={`text-3xl md:text-4xl font-bold font-serif text-center mb-16 ${className}`}
    >
      {children}
    </h3>
  )
}
