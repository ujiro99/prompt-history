interface SolutionCardProps {
  emoji: string
  title: string
  description: string
}

export function SolutionCard({ emoji, title, description }: SolutionCardProps) {
  return (
    <div className="bg-white rounded-lg p-8 border border-zinc-200/50">
      <div className="flex items-center gap-4 mb-4">
        <span className="text-4xl">{emoji}</span>
        <h4 className="text-xl font-semibold text-zinc-800">{title}</h4>
      </div>
      <div>
        <p className="text-base leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
