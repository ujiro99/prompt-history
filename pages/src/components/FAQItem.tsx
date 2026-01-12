import type { ReactNode } from "react"

interface FAQItemProps {
  question: string
  answer: ReactNode
}

export function FAQItem({ question, answer }: FAQItemProps) {
  return (
    <div className="p-6 bg-white rounded-lg border border-zinc-200/50">
      <p className="font-semibold text-zinc-700 mb-2">{question}</p>
      <p className="text-sm text-zinc-700 leading-relaxed text-pretty whitespace-pre-wrap">
        {answer}
      </p>
    </div>
  )
}
