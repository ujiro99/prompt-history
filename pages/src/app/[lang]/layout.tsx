import { Footer } from "@/components/Footer"
import { Languages } from "@/features/locale"

export function generateStaticParams() {
  return Languages.map((lang) => ({ lang }))
}

type Props = {
  children: React.ReactNode
}

export default async function LangLayout(props: Props) {
  const { children } = props
  return (
    <div>
      {children}
      <Footer />
    </div>
  )
}
