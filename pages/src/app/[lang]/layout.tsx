import { Footer } from "@/components/Footer"
import { Header } from "@/components/Header"
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
      <Header />
      {children}
      <Footer />
    </div>
  )
}
