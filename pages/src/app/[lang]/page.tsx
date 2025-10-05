import { CTAButton } from "@/components/CTAButton"
import { FAQItem } from "@/components/FAQItem"
import { Image } from "@/components/Image"
import { IssueCard } from "@/components/IssueCard"
import { SectionHeading } from "@/components/SectionHeading"
import { SolutionCard } from "@/components/SolutionCard"
import { getDict } from "@/features/locale"
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

      <section
        id="hero"
        className="py-20 md:py-28 text-center px-4 sm:px-6 lg:px-8"
      >
        <div className="max-w-4xl mx-auto whitespace-normal wrap-normal break-keep mb-14">
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-zinc-700 leading-tight tracking-wide mb-8">
            {t.hero.mainCopy}
          </h2>
          <p className="text-lg md:text-xl leading-relaxed">{t.hero.subCopy}</p>
        </div>
        <div>
          <p className="text-base md:text-lg text-zinc-600 mb-14 max-w-3xl mx-auto leading-relaxed">
            {t.hero.description}
          </p>
          <CTAButton />
        </div>
      </section>

      <section id="issues" className="py-20 bg-zinc-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeading>
            AIを使うほどに感じる、「ちょっとした不満」
          </SectionHeading>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <IssueCard
              emoji="😩"
              title="毎回同じプロンプトを打ち直し"
              description="わずかな違いのプロンプトを毎回手入力。非効率な時間が積み重なっていきます。"
            />

            <IssueCard
              emoji="📂"
              title="定型プロンプトを探すのが大変"
              description="いつか作ったあの渾身のプロンプト、再び使う時に探し回っていませんか？"
            />

            <IssueCard
              emoji="⏰"
              title="設定・準備に時間をかけたくない"
              description="業務効率化が真の目的。ツールの事前準備に時間を費やすのは本末転倒です。"
            />

            <IssueCard
              emoji="💭"
              title="別のモデルで試したい"
              description="プロンプトを別のモデルで試したいけど、コピペが面倒。サクサク試せたら、改善が加速しませんか？"
            />

            <IssueCard
              emoji="🌐"
              title="サービス横断での再利用が困難"
              description="ChatGPTやGeminiなど、複数のAIサービスを使うとプロンプトが分散し、また探すのが大変に..."
            />

            <IssueCard
              emoji="💡"
              title="良いプロンプトの保存し忘れ"
              description="一度きりの最高のプロンプト、どこかに行ってしまった経験はありませんか？"
            />
            <div className="hidden lg:block"></div>
          </div>
        </div>
      </section>

      <section id="solutions" className="py-20 md:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <SectionHeading>
            その不満、「Prompt history」が解決します
          </SectionHeading>

          <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
            <SolutionCard
              emoji="📝"
              title="自動保存：手間ゼロでプロンプトを資産化"
              description="AIチャットサービスでのプロンプト送信時に自動で履歴を保存します。これで「保存し忘れ」の心配はゼロ！業務効率化を邪魔する手動のコピペ作業から完全に解放されます。"
            />

            <SolutionCard
              emoji="⚡"
              title="爆速再利用：思考を途切れさせない即時補完"
              description="保存されたプロンプトは、メニューバーから一覧表示できる他、AIチャットの入力欄に自動補完として表示されます。プロンプトを探す時間がゼロに。思考を途切れさせず、即座に作業を再開できます。"
            />

            <SolutionCard
              emoji="🌐"
              title="AIサービス横断：いろんなモデルで使い回し"
              description="ChatGPT、Gemini、Claude、Perplexityに対応。サービスをまたいで同じプロンプトを使い回せます。複数のAIサービスを使う方でも、もうプロンプトを探し回る必要はありません。"
            />
          </div>

          <div className="my-16 mx-auto w-32 h-1 bg-gradient-to-r from-transparent via-zinc-300 to-transparent" />

          <p className="max-w-4xl mt-12 mx-auto text-lg text-center text-zinc-800 leading-relaxed">
            プロンプトの入力や整理に時間を取られず、もっと大切なことに集中したい方へ。
            <br />
            あなたが本来取り組みたい、創造的な作業や学びの時間を、最大化するようサポートします。
          </p>
        </div>
      </section>

      <section className="py-24 md:py-32 text-center px-4 sm:px-6 lg:px-8 bg-zinc-100">
        <SectionHeading className="mb-6">
          いますぐ、プロンプト管理のストレスから解放されましょう
        </SectionHeading>
        <p className="text-lg text-zinc-600 mb-4">
          インストールはたったの10秒、効果は今日から
        </p>

        <CTAButton />

        <div className="mt-24 max-w-3xl mx-auto">
          <h4 className="text-xl font-semibold mb-8">よくある質問</h4>
          <div className="text-left space-y-6">
            <FAQItem
              question="Q: データのセキュリティは大丈夫ですか？"
              answer="A: はい。Prompt historyは、あなたのプロンプトデータを外部サーバーに送信したり保存したりしません。全てのデータはあなたのブラウザ内で安全に管理されます。"
            />
            <FAQItem
              question="Q: 事前設定なしですぐに使えますか？"
              answer="A: はい。インストールするだけで、あなたが次にプロンプトを送信した瞬間から自動保存と再利用機能が有効になります。"
            />
            <FAQItem
              question="Q: サポートするAIサービスは増えますか？"
              answer="A: はい。今後も主要なAIチャットサービスへの対応を拡大していく予定です。ご要望があればChrome Web Storeのレビュー欄からぜひお知らせください。"
            />
          </div>
        </div>
      </section>
    </main>
  )
}
