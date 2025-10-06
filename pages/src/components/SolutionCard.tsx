interface SolutionCardProps {
  emoji: string
  title: string
  description: string
}

export function SolutionCard({ emoji, title, description }: SolutionCardProps) {
  return (
    <div className="relative bg-white rounded-lg p-8 overflow-hidden group">
      {/* Animated gradient border */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-75 blur-sm animate-gradient-rotate" />
      <div className="absolute inset-[2px] bg-white rounded-lg" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-4xl">{emoji}</span>
          <h4 className="text-xl font-semibold text-zinc-800">{title}</h4>
        </div>
        <div>
          <p className="text-base leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  )
}
