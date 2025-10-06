import { CTAButton } from "@/components/CTAButton"
import { FAQItem } from "@/components/FAQItem"
import { Image } from "@/components/Image"
import { IssueCard } from "@/components/IssueCard"
import { SectionHeading } from "@/components/SectionHeading"
import { SolutionCard } from "@/components/SolutionCard"
import { getDict } from "@/features/locale"
import { getBasePath } from "@/lib/utils"
import type { LangProps } from "@/types/locale"

export default async function Home({ params }: { params: Promise<LangProps> }) {
  const { lang } = await params
  const t = getDict(lang).lp
  return (
    <main>
      <section
        id="logo"
        className="flex justify-center items-center pt-20 gap-6"
      >
        <Image
          src="/icon.png"
          alt="Chrome Web Store"
          className="inline-block"
          width={100}
          height={100}
        />
        <p className="text-4xl md:text-6xl font-logo font-semibold text-zinc-700 tracking-wider">
          Prompt history
        </p>
      </section>

      <section id="hero" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8">
        <div className="w-fit lg:w-full mb-16 mx-auto lg:flex justify-center gap-2">
          <div className="flex flex-col justify-center max-w-xl md:max-w-2xl mb-10 lg:mb-0 whitespace-pre-line">
            <h2 className="text-xl md:text-3xl lg:text-4xl font-serif font-bold text-zinc-700 leading-tight tracking-wide mb-8">
              {t.hero.mainCopy}
            </h2>
            <p className="text-lg lg:text-xl leading-relaxed">
              {t.hero.subCopy}
            </p>
          </div>
          <div className="w-xl mx-auto lg:mx-0">
            <video
              disablePictureInPicture
              className="rounded-md aspect-[3/2]"
              autoPlay
              loop
              muted
            >
              <source src={`${getBasePath()}/demo.mp4`} type="video/mp4" />
            </video>
          </div>
        </div>

        <div className="text-center">
          <p className="text-base md:text-lg mb-14 max-w-3xl mx-auto leading-relaxed whitespace-pre-line">
            {t.hero.description}
          </p>
          <CTAButton lang={lang} />
        </div>
      </section>

      <section id="issues" className="py-20 bg-zinc-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading>{t.issues.heading}</SectionHeading>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.issues.cards.map((card) => (
              <IssueCard
                key={card.title}
                emoji={card.emoji}
                title={card.title}
                description={card.description}
              />
            ))}
            <div className="hidden lg:block"></div>
          </div>
        </div>
      </section>

      <section id="solutions" className="py-20 md:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <SectionHeading>{t.solutions.heading}</SectionHeading>

          <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
            {t.solutions.cards.map((card) => (
              <SolutionCard
                key={card.title}
                emoji={card.emoji}
                title={card.title}
                description={card.description}
              />
            ))}
          </div>

          <div className="my-16 mx-auto w-32 h-1 bg-gradient-to-r from-transparent via-zinc-300 to-transparent" />

          <p className="max-w-4xl mt-12 mx-auto text-lg text-center text-zinc-800 leading-relaxed whitespace-pre-line">
            {t.solutions.closing}
          </p>
        </div>
      </section>

      <section className="py-24 md:py-32 text-center px-4 sm:px-6 lg:px-8 bg-zinc-100">
        <SectionHeading className="mb-6">{t.cta.heading}</SectionHeading>
        <p className="text-lg text-zinc-600 mb-4">{t.cta.subheading}</p>

        <CTAButton lang={lang} />

        <div className="mt-24 max-w-3xl mx-auto">
          <h4 className="text-xl font-semibold mb-8">{t.faq.heading}</h4>
          <div className="text-left space-y-6">
            {t.faq.items.map((item) => (
              <FAQItem
                key={item.question}
                question={item.question}
                answer={item.answer}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
