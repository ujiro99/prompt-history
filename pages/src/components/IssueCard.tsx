interface IssueCardProps {
  emoji: string
  title: string
  description: string
  className?: string
}

export function IssueCard({
  emoji,
  title,
  description,
  className = "",
}: IssueCardProps) {
  return (
    <div
      className={`px-8 py-7 bg-white rounded-lg border border-zinc-200/50 ${className}`}
    >
      <span className="text-3xl mb-4 block">{emoji}</span>
      <h4 className="text-lg font-semibold mb-3">{title}</h4>
      <p className="text-base leading-relaxed">{description}</p>
    </div>
  )
}
