# アーキテクチャ設計

## 概要

プロンプト自動整理機能のアーキテクチャ設計。
既存の Prompt History 拡張機能のアーキテクチャに準拠し、保守性と拡張性を重視した設計とする。

**関連ドキュメント**:

- **03_data_model.md**: データ構造、型定義、プロンプト定義
- **05_api_design.md**: Gemini API 統合の詳細実装

---

## 1. システム全体構成

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer (React)                     │
├─────────────────────────────────────────────────────────┤
│  InputPopup (既存)                                      │
│   ├─ HistoryMenu                                        │
│   ├─ PinnedMenu (拡張)                                  │
│   │   ├─ Section A: ユーザーピン留め                    │
│   │   └─ Section B: AIおすすめテンプレ (New)            │
│   └─ SettingsMenu (拡張)                                │
│       └─ プロンプト整理設定 (New)                       │
│                                                         │
│  OrganizerDialog (New)                                  │
│   ├─ 設定ダイアログ                                     │
│   ├─ 実行サマリ                                         │
│   └─ プレビュー画面                                     │
├─────────────────────────────────────────────────────────┤
│                  Service Layer                          │
├─────────────────────────────────────────────────────────┤
│  PromptOrganizerService (New)                           │
│   ├─ executeOrganization()                              │
│   ├─ estimateExecution()                                │
│   └─ saveTemplates()                                    │
│                                                         │
│  GeminiClient (既存 - 拡張)                             │
│   ├─ generateContentStream() (既存)                     │
│   ├─ generateStructuredContent() (New)                  │
│   └─ estimateTokens() (New)                             │
│                                                         │
│  CategoryService (New)                                  │
│   ├─ getAllCategories()                                 │
│   ├─ createCategory()                                   │
│   └─ initializeDefaults()                               │
│                                                         │
│  PromptsService (既存 - 拡張なし)                       │
│  PinsService (既存 - 拡張なし)                          │
├─────────────────────────────────────────────────────────┤
│                  Storage Layer (WXT)                    │
├─────────────────────────────────────────────────────────┤
│  promptsStorage (既存)                                  │
│  categoriesStorage (New)                                │
│  promptOrganizerSettingsStorage (New)                   │
└─────────────────────────────────────────────────────────┘
           ↓                                    ↑
      [Gemini API]                    [Chrome Storage API]
```

---

## 2. ディレクトリ構成

```
src/
├── components/
│   └── inputMenu/
│       ├── InputPopup.tsx (拡張)
│       ├── PromptList.tsx (拡張)
│       └── organizer/ (New)
│           ├── OrganizerSettingsDialog.tsx
│           ├── OrganizerSummaryDialog.tsx
│           ├── OrganizerPreviewDialog.tsx
│           ├── TemplateCandidateCard.tsx
│           ├── ExecutionEstimate.tsx
│           └── CategorySelector.tsx
│
├── services/
│   ├── genai/ (既存)
│   │   ├── GeminiClient.ts (拡張 - 構造化出力メソッド追加)
│   │   ├── types.ts (拡張)
│   │   └── defaultPrompts.ts (既存 - Prompt Improver用)
│   │
│   ├── promptOrganizer/ (New)
│   │   ├── promptOrganizerService.ts
│   │   ├── tokenEstimator.ts
│   │   ├── templateConverter.ts
│   │   └── defaultPrompts.ts (New - Prompt Organizer用)
│   │
│   └── storage/
│       ├── prompts.ts (既存 - 変更なし)
│       ├── pins.ts (既存 - 変更なし)
│       ├── categories.ts (New)
│       ├── organizerSettings.ts (New)
│       ├── definitions.ts (拡張)
│       └── index.ts (拡張)
│
├── types/
│   ├── prompt.ts (拡張)
│   └── organizer.ts (New)
│
├── utils/
│   └── organizer/ (New)
│       ├── promptFilter.ts
│       └── categoryMatcher.ts
│
└── hooks/
    └── usePromptOrganizer.ts (New)

docs/
└── PromptOrganizer/
    ├── 01_requirements.md (既存)
    ├── 02_architecture.md (本ドキュメント)
    ├── 03_data_model.md
    ├── 04_ui_flow.md
    └── 05_api_design.md
```

---

## 3. コンポーネント設計

### 3.1 UI コンポーネント階層

```
OrganizerSettingsDialog
  ├─ DialogHeader
  ├─ FilterSettings
  │   ├─ PeriodSelector (1週/1ヶ月/1年)
  │   ├─ ExecutionCountInput
  │   └─ MaxPromptsInput
  ├─ OrganizationPromptEditor
  │   └─ Textarea (編集可能 - systemInstructionは固定)
  ├─ ExecutionEstimate (New)
  │   ├─ TokenCountDisplay
  │   ├─ ContextUsageBar
  │   └─ CostEstimate
  └─ DialogFooter
      ├─ CancelButton
      └─ ExecuteButton

OrganizerSummaryDialog
  ├─ DialogHeader
  ├─ ResultSummary
  │   ├─ TemplateCountBadge
  │   ├─ SourceInfoCard
  │   └─ HighlightCard (代表的な1件)
  └─ DialogFooter
      ├─ PreviewButton
      └─ SaveAllButton

OrganizerPreviewDialog
  ├─ DialogHeader
  ├─ TwoColumnLayout
  │   ├─ LeftPane: TemplateCandidateList
  │   │   └─ TemplateCandidateCard[] (クリック選択)
  │   └─ RightPane: TemplateCandidateDetail
  │       ├─ TitleInput (編集可)
  │       ├─ UseCaseInput (編集可)
  │       ├─ CategorySelector (編集可)
  │       ├─ ContentPreview (変数ハイライト)
  │       ├─ VariablesList
  │       └─ SourcePromptsCollapse
  └─ DialogFooter
      ├─ DiscardButton
      ├─ SaveButton
      └─ SaveAndPinButton
```

### 3.2 PinnedMenu のセクション分割

```typescript
// PromptList.tsx の拡張
interface PromptListProps {
  menuType: "history" | "pinned"
  prompts: Prompt[]
  // ... その他のプロパティ
}

// menuType === "pinned" の場合、内部でセクション分割
function PromptList({ menuType, prompts, ... }: PromptListProps) {
  if (menuType === "pinned") {
    const userPinned = prompts.filter(p => !p.isAIGenerated)
    const aiRecommended = prompts.filter(
      p => p.isAIGenerated && p.aiMetadata?.showInPinned
    )

    return (
      <>
        {userPinned.length > 0 && (
          <Section title="あなたのピン留め">
            {userPinned.map(p => <MenuItem {...} />)}
          </Section>
        )}
        {aiRecommended.length > 0 && (
          <Section title="AIのおすすめテンプレ">
            {aiRecommended.map(p => (
              <MenuItem {...} withAIBadge />
            ))}
          </Section>
        )}
      </>
    )
  }

  // history の場合は既存の表示ロジック
  return <>{/* ... */}</>
}
```

### 3.3 新規未確認の装飾

```typescript
// MenuItem に未確認状態の視覚的フィードバック追加
interface MenuItemProps {
  // ... 既存プロパティ
  isAIGenerated?: boolean
  isUnconfirmed?: boolean  // aiMetadata.confirmed === false
}

// CSS でキラキラアニメーション
.ai-generated-unconfirmed {
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { background-position: -100% 0; }
  100% { background-position: 100% 0; }
}
```

---

## 4. サービス層設計

### 4.1 PromptOrganizerService

**責務**: プロンプト整理の実行と結果管理

```typescript
class PromptOrganizerService {
  /**
   * プロンプト整理を実行
   */
  async executeOrganization(
    settings: PromptOrganizerSettings,
  ): Promise<PromptOrganizerResult> {
    // 1. 対象プロンプト抽出
    const targetPrompts = await this.filterPrompts(settings)

    // 2. GeminiClient を取得・初期化
    const geminiClient = GeminiClient.getInstance()
    if (!geminiClient.isInitialized()) {
      const apiKey = await genaiApiKeyStorage.getValue()
      geminiClient.initialize(apiKey)
    }

    // 3. Gemini API 呼び出し（構造化出力）
    const prompt = this.buildPromptText({
      organizationPrompt: settings.organizationPrompt,
      prompts: targetPrompts,
      existingCategories: await categoryService.getAllCategories(),
    })

    const { data, usage } =
      await geminiClient.generateStructuredContent<OrganizePromptsResponse>(
        prompt,
        ORGANIZER_RESPONSE_SCHEMA,
        {
          model: "gemini-2.5-flash",
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      )

    // 4. レスポンスをテンプレート候補に変換
    const templates = await this.convertToTemplateCandidates(
      data.templates,
      targetPrompts,
      settings,
    )

    // 5. 結果オブジェクトを返す
    return {
      templates,
      sourceCount: targetPrompts.length,
      periodDays: settings.filterPeriodDays,
      executedAt: new Date(),
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCost: this.calculateCost(usage),
    }
  }

  /**
   * 実行前のコスト見積もり
   */
  async estimateExecution(
    settings: PromptOrganizerSettings,
  ): Promise<OrganizerExecutionEstimate> {
    const targetPrompts = await this.filterPrompts(settings)

    // プロンプトテキストを構築
    const prompt = this.buildPromptText({
      organizationPrompt: settings.organizationPrompt,
      prompts: targetPrompts,
      existingCategories: await categoryService.getAllCategories(),
    })

    // GeminiClient でトークン数を見積もり
    const geminiClient = GeminiClient.getInstance()
    const inputTokens = await geminiClient.estimateTokens(prompt)

    return {
      targetPromptCount: targetPrompts.length,
      estimatedInputTokens: inputTokens,
      contextUsageRate: inputTokens / GEMINI_CONTEXT_LIMIT,
      estimatedCost: this.calculateCost({ inputTokens, outputTokens: 0 }),
      model: "gemini-2.5-flash",
      contextLimit: GEMINI_CONTEXT_LIMIT,
    }
  }

  /**
   * 選択されたテンプレートを保存
   */
  async saveTemplates(candidates: TemplateCandidate[]): Promise<void> {
    const toSave = candidates.filter(
      (c) => c.userAction === "save" || c.userAction === "save_and_pin",
    )

    for (const candidate of toSave) {
      // Prompt として保存
      const prompt = await promptsService.savePrompt({
        name: candidate.title,
        content: candidate.content,
        isPinned: false, // PinsService で個別に処理
        variables: candidate.variables,
        isAIGenerated: true,
        aiMetadata: {
          ...candidate.aiMetadata,
          confirmed: true, // 保存時に確認済みにする
        },
        useCase: candidate.useCase,
        categoryId: candidate.categoryId,
      })

      // ピン留めが必要な場合
      if (candidate.userAction === "save_and_pin") {
        await pinsService.pinPrompt(prompt.id)
      }

      // showInPinned フラグを更新
      if (candidate.aiMetadata.showInPinned) {
        // すでに aiMetadata に含まれているのでそのまま
      }
    }
  }

  /**
   * 絞り込み条件に基づいてプロンプトを抽出
   */
  private async filterPrompts(
    settings: PromptOrganizerSettings,
  ): Promise<PromptForOrganization[]> {
    const allPrompts = await promptsService.getAllPrompts()
    return promptFilter.apply(allPrompts, {
      periodDays: settings.filterPeriodDays,
      minExecutionCount: settings.filterMinExecutionCount,
      maxPrompts: settings.filterMaxPrompts,
    })
  }

  /**
   * Gemini API 用のプロンプトテキストを構築
   * 詳細は 05_api_design.md を参照
   */
  private buildPromptText(request: OrganizePromptsRequest): string {
    // organizationPrompt + 既存カテゴリ + 対象プロンプトを組み合わせる
    // 実装詳細は API 設計ドキュメント参照
  }
}

export const promptOrganizerService = new PromptOrganizerService()
```

### 4.2 GeminiClient の拡張

**責務**: Gemini API との通信（既存クライアントを拡張）

既存の `GeminiClient` に以下のメソッドを追加：

```typescript
// src/services/genai/GeminiClient.ts に追加

/**
 * 構造化出力を生成
 */
public async generateStructuredContent<T>(
  prompt: string,
  schema: object,
  config?: Partial<GeminiConfig>,
): Promise<{ data: T; usage: TokenUsage }>

/**
 * トークン数を見積もり
 */
public async estimateTokens(prompt: string): Promise<number>
```

**使用例**:

```typescript
const geminiClient = GeminiClient.getInstance()
const { data, usage } =
  await geminiClient.generateStructuredContent<OrganizePromptsResponse>(
    buildPromptText(request),
    ORGANIZER_RESPONSE_SCHEMA,
    {
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  )
```

**実装詳細は `05_api_design.md` を参照。**

### 4.3 CategoryService

**責務**: カテゴリの管理

```typescript
class CategoryService {
  /**
   * すべてのカテゴリを取得
   */
  async getAllCategories(): Promise<Category[]> {
    const categories = await categoriesStorage.getValue()
    return Object.values(categories)
  }

  /**
   * カテゴリを作成
   */
  async createCategory(name: string, description?: string): Promise<Category> {
    const category: Category = {
      id: crypto.randomUUID(),
      name,
      description,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const categories = await categoriesStorage.getValue()
    categories[category.id] = category
    await categoriesStorage.setValue(categories)

    return category
  }

  /**
   * デフォルトカテゴリを初期化（i18n 対応）
   */
  async initializeDefaults(): Promise<void> {
    const existing = await categoriesStorage.getValue()
    if (Object.keys(existing).length > 0) {
      return // すでに初期化済み
    }

    // 翻訳キーからカテゴリ名を取得
    const defaults: Omit<Category, "id" | "createdAt" | "updatedAt">[] = [
      {
        name: i18n.t("organizer.category.externalCommunication"),
        description: i18n.t("organizer.category.externalCommunicationDesc"),
        isDefault: true,
      },
      {
        name: i18n.t("organizer.category.internalCommunication"),
        description: i18n.t("organizer.category.internalCommunicationDesc"),
        isDefault: true,
      },
      {
        name: i18n.t("organizer.category.documentCreation"),
        description: i18n.t("organizer.category.documentCreationDesc"),
        isDefault: true,
      },
      {
        name: i18n.t("organizer.category.development"),
        description: i18n.t("organizer.category.developmentDesc"),
        isDefault: true,
      },
      {
        name: i18n.t("organizer.category.other"),
        description: i18n.t("organizer.category.otherDesc"),
        isDefault: true,
      },
    ]

    const categories: Record<string, Category> = {}
    for (const def of defaults) {
      const id = crypto.randomUUID()
      categories[id] = {
        ...def,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }

    await categoriesStorage.setValue(categories)
  }
}

export const categoryService = new CategoryService()
```

---

## 5. 状態管理

### 5.1 Custom Hook: usePromptOrganizer

```typescript
/**
 * プロンプト整理機能の状態管理フック
 */
export function usePromptOrganizer() {
  const [settings, setSettings] = useState<PromptOrganizerSettings | null>(null)
  const [estimate, setEstimate] = useState<OrganizerExecutionEstimate | null>(
    null,
  )
  const [result, setResult] = useState<PromptOrganizerResult | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<OrganizerError | null>(null)

  // 設定の読み込み
  useEffect(() => {
    promptOrganizerSettingsStorage.getValue().then(setSettings)
  }, [])

  // 設定変更時に見積もりを再計算
  useEffect(() => {
    if (!settings) return

    promptOrganizerService
      .estimateExecution(settings)
      .then(setEstimate)
      .catch(console.error)
  }, [settings])

  /**
   * 整理を実行
   */
  const executeOrganization = async () => {
    if (!settings) return

    setIsExecuting(true)
    setError(null)

    try {
      const result = await promptOrganizerService.executeOrganization(settings)
      setResult(result)
    } catch (err) {
      setError({
        code: "API_ERROR",
        message: err.message,
      })
    } finally {
      setIsExecuting(false)
    }
  }

  /**
   * テンプレートを保存
   */
  const saveTemplates = async (candidates: TemplateCandidate[]) => {
    try {
      await promptOrganizerService.saveTemplates(candidates)
    } catch (err) {
      setError({
        code: "API_ERROR",
        message: err.message,
      })
    }
  }

  return {
    settings,
    estimate,
    result,
    isExecuting,
    error,
    executeOrganization,
    saveTemplates,
  }
}
```

---

## 6. イベントフロー

### 6.1 整理実行フロー

```
[ユーザーが設定ダイアログを開く]
  ↓
usePromptOrganizer() が設定を読み込み
  ↓
設定変更 → 自動的に見積もり再計算
  ↓
[整理するボタン押下]
  ↓
executeOrganization()
  ├─ isExecuting = true
  ├─ promptOrganizerService.executeOrganization()
  │   ├─ プロンプト抽出
  │   ├─ Gemini API 呼び出し
  │   └─ テンプレート候補生成
  ├─ result をセット
  └─ isExecuting = false
  ↓
[サマリダイアログ表示]
  ↓
[プレビューボタン押下]
  ↓
[プレビューダイアログ表示]
  ↓
[ユーザーが編集・選択]
  ↓
[保存ボタン押下]
  ↓
saveTemplates(candidates)
  ├─ promptsService.savePrompt() (各テンプレート)
  └─ pinsService.pinPrompt() (必要な場合)
  ↓
[完了通知]
```

### 6.2 Pinned リスト表示フロー

```
[Pinned Menu を開く]
  ↓
promptsService.getAllPrompts()
  ↓
prompts.filter(p => p.isPinned)
  ↓
セクション分割
  ├─ Section A: !isAIGenerated
  └─ Section B: isAIGenerated && showInPinned
  ↓
未確認テンプレートにキラキラアニメーション
  (aiMetadata.confirmed === false)
  ↓
[ユーザーがテンプレートをクリック/実行]
  ↓
aiMetadata.confirmed = true に更新
  ↓
アニメーション解除
```

---

## 7. エラーハンドリング

### 7.1 エラー境界

```typescript
// OrganizerDialog コンポーネント内でエラーハンドリング
function OrganizerSettingsDialog() {
  const { error, executeOrganization } = usePromptOrganizer()

  if (error) {
    return (
      <ErrorDisplay
        code={error.code}
        message={error.message}
        onRetry={error.code === 'NETWORK_ERROR' ? executeOrganization : undefined}
      />
    )
  }

  return <>{/* 通常UI */}</>
}
```

### 7.2 エラータイプ別の処理

| エラーコード       | 内容               | ユーザーアクション               |
| ------------------ | ------------------ | -------------------------------- |
| `API_ERROR`        | Gemini API エラー  | エラーメッセージ表示、設定見直し |
| `NETWORK_ERROR`    | ネットワークエラー | リトライボタン表示               |
| `QUOTA_EXCEEDED`   | API クォータ超過   | 待機を促すメッセージ             |
| `INVALID_RESPONSE` | レスポンス形式不正 | 管理者に報告を促す               |

---

## 8. パフォーマンス最適化

### 8.1 レンダリング最適化

- `useMemo` でプロンプトのフィルタリング結果をキャッシュ
- `React.memo` で個別のテンプレートカードをメモ化
- Virtualization（react-window）は候補数が多い場合に導入検討

### 8.2 API 呼び出し最適化

- トークン見積もりはデバウンス処理（500ms）
- Gemini API 呼び出しは1回のみ（リトライは手動）
- レスポンスキャッシュは行わない（常に最新データで整理）

---

## 9. テスト戦略

### 9.1 ユニットテスト

- **Services**: promptOrganizerService, categoryService
- **Utils**: promptFilter, tokenEstimator, categoryMatcher
- **Hooks**: usePromptOrganizer

### 9.2 統合テスト

- Gemini API モックを使用した E2E フロー
- ストレージの読み書き

### 9.3 E2E テスト（Playwright）

- 設定ダイアログの操作
- プレビュー画面での編集・保存
- Pinned リストのセクション表示

---

## 10. セキュリティ考慮

### 10.1 API キー管理

- `genaiApiKeyStorage` に保存（既存の仕組みを利用）
- クライアント側で直接 Gemini API を呼び出す（サーバー不要）
- API キーは localStorage に暗号化されずに保存される点に注意
  - ユーザーに十分な説明を提供

### 10.2 データ送信

- 最小限の情報のみ Gemini に送信（`PromptForOrganization`）
- プロンプトの `name` は送信しない（個人情報が含まれる可能性）
- ユーザーがプレビュー画面で内容を確認してから保存

---

## 11. 将来的な拡張性

### 11.1 他の AI モデルへの対応

- `GeminiService` を抽象化して `AIService` インターフェースを定義
- Claude, ChatGPT など他のモデルにも対応可能な設計

### 11.2 自動実行スケジューリング

- 現状は「マニュアル起動のみ」
- 将来的に「毎週自動実行」などのスケジュール機能を追加可能

### 11.3 テンプレートの評価・改善

- ユーザーフィードバック（👍👎）の収集
- 使用頻度に基づくテンプレートの自動アーカイブ
