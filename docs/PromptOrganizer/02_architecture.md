# アーキテクチャ設計

## 概要

プロンプト自動整理機能のアーキテクチャ設計。
既存の Prompt History 拡張機能のアーキテクチャに準拠し、保守性と拡張性を重視した設計とする。

**関連ドキュメント**:

- **03_data_model.md**: データ構造、型定義、プロンプト定義
- **05_api_design.md**: Gemini API 統合の詳細実装

---

## 1. システム全体構成

### 1.1 主要ファイル構成

```
src/services/promptOrganizer/
  ├── PromptOrganizerService.ts    # メインサービス
  ├── CategoryService.ts            # カテゴリ管理
  ├── defaultPrompts.ts             # システムインストラクション、デフォルト設定
  └── defaultCategories.ts          # デフォルトカテゴリ定数（新規）
```

### 1.2 システム全体構成図

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
│   └─ (デフォルトカテゴリはストレージfallbackで初期化)   │
│                                                         │
│  PromptsService (既存 - 拡張なし)                       │
│  PinsService (既存 - 拡張なし)                          │
├─────────────────────────────────────────────────────────┤
│                  Storage Layer (WXT)                    │
├─────────────────────────────────────────────────────────┤
│  promptsStorage (既存)                                  │
│  categoriesStorage (New - fallbackでデフォルトカテゴリ初期化) │
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
│   │   ├── PromptOrganizerService.ts
│   │   ├── CategoryService.ts
│   │   ├── defaultPrompts.ts (New - システムインストラクション、デフォルト設定)
│   │   ├── defaultCategories.ts (New - デフォルトカテゴリ定数)
│   │   ├── tokenEstimator.ts
│   │   └── templateConverter.ts
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

**設計方針**: 既存の`InputPopup.tsx`パターンに合わせたフラット構造を採用し、深いネスト構造を避ける。中間コンテナコンポーネントを削除し、プロップドリリングを削減。

```
OrganizerSettingsDialog
  ├─ DialogHeader
  ├─ PeriodSelector (直接配置 - 1週/1ヶ月/1年)
  ├─ ExecutionCountInput (直接配置)
  ├─ MaxPromptsInput (直接配置)
  ├─ OrganizationPromptEditor (Textareaラッパー)
  ├─ TokenCountDisplay (直接配置)
  ├─ ContextUsageBar (直接配置)
  ├─ CostEstimate (直接配置)
  └─ DialogFooter
      ├─ CancelButton
      └─ ExecuteButton

OrganizerSummaryDialog
  ├─ DialogHeader
  ├─ TemplateCountBadge (直接配置)
  ├─ SourceInfoCard (直接配置)
  ├─ HighlightCard (直接配置 - 代表的な1件)
  └─ DialogFooter
      ├─ PreviewButton
      └─ SaveAllButton

OrganizerPreviewDialog
  ├─ DialogHeader
  ├─ TwoColumnLayout
  │   ├─ LeftPane: TemplateCandidateList
  │   │   └─ TemplateCandidateCard[] (クリック選択)
  │   └─ RightPane: TemplateCandidateDetail
  │       ├─ TitleInput (直接配置 - 編集可)
  │       ├─ UseCaseInput (直接配置 - 編集可)
  │       ├─ CategorySelector (直接配置 - 編集可)
  │       ├─ ContentPreview (直接配置 - 変数ハイライト)
  │       ├─ VariablesList (直接配置)
  │       └─ SourcePromptsCollapse (直接配置)
  └─ DialogFooter
      ├─ DiscardButton
      ├─ SaveButton
      └─ SaveAndPinButton
```

**変更内容**:

- `OrganizerSettingsDialog`: `FilterSettings` と `ExecutionEstimate` 中間コンテナを削除し、子コンポーネントを直接配置
- `OrganizerSummaryDialog`: `ResultSummary` 中間コンテナを削除し、子コンポーネントを直接配置
- `OrganizerPreviewDialog`: `TwoColumnLayout` は維持（レイアウトの役割が明確）、`RightPane` 内の子コンポーネントは直接配置

**利点**:

- 状態管理の簡素化（プロップドリリングの削減）
- 既存の`InputPopup.tsx`パターンとの整合性
- コンポーネントの再利用性向上

### 3.2 PinnedMenu のセクション分割

`PromptList.tsx` を拡張し、`menuType === "pinned"` の場合に以下の2セクションに分割:

- **Section A: あなたのピン留め** - ユーザーが手動でピン留めしたプロンプト (`!isAIGenerated`)
- **Section B: AIのおすすめテンプレ** - AI生成テンプレートで `showInPinned === true` のもの

### 3.3 新規未確認の装飾

AI生成テンプレートで未確認状態 (`aiMetadata.confirmed === false`) の場合、視覚的フィードバックを提供:

- グラデーション背景とシマーアニメーション
- 初回クリック時に `confirmed: true` に更新してアニメーション削除

---

## 4. サービス層設計

### 4.0 サービス間の依存関係

```
┌─────────────────────────────────────┐
│  PromptOrganizerService (ファサード) │
│  - executeOrganization()            │
└──────────┬──────────────────────────┘
           │ 依存
           ↓
    ┌──────┴──────┬──────────┬──────────────┐
    │             │          │              │
    ↓             ↓          ↓              ↓
┌─────────┐  ┌─────────┐  ┌────────┐  ┌──────────┐
│Prompt   │  │Template │  │Cost    │  │Template  │
│Filter   │  │Generator│  │Estimator│ │Save      │
│Service  │  │Service  │  │Service │  │Service   │
└─────────┘  └────┬────┘  └────────┘  └──────────┘
                  │
                  ↓ 依存
            ┌──────────┐
            │Template  │
            │Converter │
            │Service   │
            └──────────┘
```

**責務の分離**:

- `PromptOrganizerService`: 全体のオーケストレーションを担当
- `PromptFilterService`: プロンプトフィルタリングのビジネスロジック
- `TemplateGeneratorService`: AI生成とテンプレート候補への変換
- `CostEstimatorService`: トークン数とコスト計算
- `TemplateSaveService`: テンプレートの永続化

### 4.1 PromptOrganizerService（ファサード）

**責務**: プロンプト整理の実行オーケストレーション

**主要メソッド**:

- `executeOrganization()`: 各サービスを呼び出して整理を実行
  1. PromptFilterService でプロンプト抽出
  2. TemplateGeneratorService でテンプレート生成
  3. CostEstimatorService でコスト計算
  4. 結果オブジェクトを返す

- `estimateExecution()`: 実行前のコスト見積もり (CostEstimatorService に委譲)

  /\*\*
  - テンプレート保存（TemplateSaveService に委譲）
    \*/
    async saveTemplates(candidates: TemplateCandidate[]): Promise<void> {
    return this.saveService.saveTemplates(candidates)
    }
    }

export const promptOrganizerService = new PromptOrganizerService(
promptFilterService,
templateGeneratorService,
costEstimatorService,
templateSaveService,
)

````

### 4.1.1 PromptFilterService

**責務**: プロンプトのフィルタリングロジック

```typescript
class PromptFilterService {
  /**
   * 絞り込み条件に基づいてプロンプトを抽出
   */
  async filterPrompts(
    settings: PromptOrganizerSettings,
  ): Promise<PromptForOrganization[]> {
    const allPrompts = await promptsService.getAllPrompts()

    return this.applyFilters(allPrompts, {
      periodDays: settings.filterPeriodDays,
      minExecutionCount: settings.filterMinExecutionCount,
      maxPrompts: settings.filterMaxPrompts,
    })
  }

  /**
   * フィルター適用
   */
  private applyFilters(
    prompts: Prompt[],
    filters: PromptFilters,
  ): PromptForOrganization[] {
    const now = new Date()
    const cutoffDate = new Date(now.getTime() - filters.periodDays * 24 * 60 * 60 * 1000)

    return prompts
      // 期間フィルター
      .filter(p => p.lastExecutedAt >= cutoffDate)
      // 実行回数フィルター
      .filter(p => p.executionCount >= filters.minExecutionCount)
      // AI生成を除外
      .filter(p => !p.isAIGenerated)
      // 実行回数でソート（降順）
      .sort((a, b) => b.executionCount - a.executionCount)
      // 最大件数
      .slice(0, filters.maxPrompts)
      // 必要なフィールドのみ抽出
      .map(p => ({
        id: p.id,
        name: p.name,
        content: p.content,
        executionCount: p.executionCount,
      }))
  }
}

export const promptFilterService = new PromptFilterService()
````

### 4.1.2 TemplateGeneratorService

**責務**: Gemini API 呼び出しとテンプレート候補への変換

```typescript
class TemplateGeneratorService {
  constructor(private templateConverter: TemplateConverter) {}

  /**
   * テンプレート生成
   */
  async generateTemplates(request: {
    organizationPrompt: string
    prompts: PromptForOrganization[]
    periodDays: number
  }): Promise<{ templates: TemplateCandidate[]; usage: TokenUsage }> {
    // 1. GeminiClient を取得・初期化
    const geminiClient = GeminiClient.getInstance()
    if (!geminiClient.isInitialized()) {
      const apiKey = await genaiApiKeyStorage.getValue()
      geminiClient.initialize(apiKey)
    }

    // 2. プロンプトテキスト構築
    const promptText = this.buildPromptText({
      organizationPrompt: request.organizationPrompt,
      prompts: request.prompts,
      existingCategories: await categoryService.getAll(),
    })

    // 3. Gemini API 呼び出し（構造化出力）
    const { data, usage } =
      await geminiClient.generateStructuredContent<OrganizePromptsResponse>(
        promptText,
        ORGANIZER_RESPONSE_SCHEMA,
        {
          model: "gemini-2.5-flash",
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      )

    // 4. レスポンスをテンプレート候補に変換
    const templates = data.templates.map((generated) =>
      this.templateConverter.convertToCandidate(generated, request.periodDays),
    )

    return { templates, usage }
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

export const templateGeneratorService = new TemplateGeneratorService(
  templateConverter,
)
```

### 4.1.3 CostEstimatorService

**責務**: トークン数とコスト計算

```typescript
class CostEstimatorService {
  private static readonly PRICING = {
    // Gemini 2.5 Flash の料金（2025年11月時点）
    inputTokenPer1M: 0.075, // $0.075 per 1M input tokens
    outputTokenPer1M: 0.3, // $0.30 per 1M output tokens
    usdToJpy: 150, // USD->JPY 換算レート（設定可能）
  }

  /**
   * トークン使用量からコストを計算
   */
  calculateCost(usage: TokenUsage): number {
    const inputCost =
      (usage.inputTokens / 1_000_000) *
      CostEstimatorService.PRICING.inputTokenPer1M
    const outputCost =
      (usage.outputTokens / 1_000_000) *
      CostEstimatorService.PRICING.outputTokenPer1M
    const totalUsd = inputCost + outputCost
    return totalUsd * CostEstimatorService.PRICING.usdToJpy
  }

  /**
   * 実行前のコスト見積もり
   */
  async estimateExecution(
    settings: PromptOrganizerSettings,
  ): Promise<OrganizerExecutionEstimate> {
    // 1. 対象プロンプトをフィルタリング
    const targetPrompts = await promptFilterService.filterPrompts(settings)

    // 2. プロンプトテキストを構築
    const promptText = templateGeneratorService.buildPromptText({
      organizationPrompt: settings.organizationPrompt,
      prompts: targetPrompts,
      existingCategories: await categoryService.getAll(),
    })

    // 3. トークン数を見積もり
    const geminiClient = GeminiClient.getInstance()
    const inputTokens = await geminiClient.estimateTokens(promptText)

    // 4. コストを計算（出力トークンは0で見積もり）
    const estimatedCost = this.calculateCost({ inputTokens, outputTokens: 0 })

    return {
      targetPromptCount: targetPrompts.length,
      estimatedInputTokens: inputTokens,
      contextUsageRate: inputTokens / GEMINI_CONTEXT_LIMIT,
      estimatedCost,
      model: "gemini-2.5-flash",
      contextLimit: GEMINI_CONTEXT_LIMIT,
    }
  }
}

export const costEstimatorService = new CostEstimatorService()
```

### 4.1.4 TemplateSaveService

**責務**: テンプレート候補の永続化

```typescript
class TemplateSaveService {
  constructor(private templateConverter: TemplateConverter) {}

  /**
   * 選択されたテンプレートを保存
   */
  async saveTemplates(candidates: TemplateCandidate[]): Promise<void> {
    const toSave = candidates.filter(
      (c) => c.userAction === "save" || c.userAction === "save_and_pin",
    )

    for (const candidate of toSave) {
      // TemplateCandidate を Prompt に変換
      const prompt = this.templateConverter.convertToPrompt(candidate)

      // Prompt として保存
      const savedPrompt = await promptsService.savePrompt(prompt)

      // ピン留めが必要な場合
      if (candidate.userAction === "save_and_pin") {
        await pinsService.pinPrompt(savedPrompt.id)
      }
    }
  }
}

export const templateSaveService = new TemplateSaveService(templateConverter)
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

**注意**: デフォルトカテゴリはストレージの`fallback`で自動初期化されます（`src/services/promptOrganizer/defaultCategories.ts`で定義）。

```typescript
/**
 * カテゴリ管理サービス
 *
 * デフォルトカテゴリは categoriesStorage の fallback で自動初期化されます。
 * (src/services/promptOrganizer/defaultCategories.ts で定義)
 */
class CategoryService {
  private static instance: CategoryService

  private constructor() {}

  public static getInstance(): CategoryService {
    if (!CategoryService.instance) {
      CategoryService.instance = new CategoryService()
    }
    return CategoryService.instance
  }

  /**
   * すべてのカテゴリを取得
   */
  async getAll(): Promise<Record<string, Category>> {
    return await categoriesStorage.getValue()
  }

  /**
   * カテゴリを作成
   */
  async create(
    category: Omit<Category, "id" | "createdAt" | "updatedAt">,
  ): Promise<Category> {
    const categories = await this.getAll()
    const newCategory: Category = {
      ...category,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    categories[newCategory.id] = newCategory
    await categoriesStorage.setValue(categories)

    return newCategory
  }

  /**
   * カテゴリを更新
   */
  async update(
    id: string,
    updates: Partial<Omit<Category, "id" | "createdAt">>,
  ): Promise<Category> {
    const categories = await this.getAll()
    const category = categories[id]

    if (!category) {
      throw new Error(`Category not found: ${id}`)
    }

    const updated: Category = {
      ...category,
      ...updates,
      id,
      updatedAt: new Date(),
    }

    categories[id] = updated
    await categoriesStorage.setValue(categories)

    return updated
  }

  /**
   * カテゴリを削除
   *
   * カテゴリ削除時のプロンプト処理:
   * - 削除されたカテゴリを参照しているプロンプトのcategoryIdをnullに設定
   * - デフォルトカテゴリは削除不可（isDefault=trueの場合はエラー）
   */
  async delete(id: string): Promise<void> {
    const categories = await this.getAll()
    const category = categories[id]

    if (!category) {
      throw new Error(`Category not found: ${id}`)
    }

    if (category.isDefault) {
      throw new Error("Cannot delete default category")
    }

    // 1. カテゴリを削除
    delete categories[id]
    await categoriesStorage.setValue(categories)

    // 2. このカテゴリを参照しているプロンプトのcategoryIdをnullに設定
    await this.cleanupOrphanedPrompts(id)
  }

  /**
   * 削除されたカテゴリを参照しているプロンプトをクリーンアップ
   *
   * @param deletedCategoryId 削除されたカテゴリID
   */
  private async cleanupOrphanedPrompts(
    deletedCategoryId: string,
  ): Promise<void> {
    const allPrompts = await promptsService.getAllPrompts()

    for (const prompt of allPrompts) {
      if (prompt.categoryId === deletedCategoryId) {
        // categoryIdをnullに設定して更新
        await promptsService.updatePrompt(prompt.id, {
          categoryId: null,
        })
      }
    }
  }

  /**
   * カテゴリをリネーム（名前変更）
   *
   * @param id カテゴリID
   * @param newName 新しいカテゴリ名
   * @returns 更新されたカテゴリ
   */
  async rename(id: string, newName: string): Promise<Category> {
    // 名前のバリデーション
    if (!newName || newName.trim().length === 0) {
      throw new Error("Category name cannot be empty")
    }

    if (newName.length > 30) {
      throw new Error("Category name must be 30 characters or less")
    }

    return this.update(id, { name: newName.trim() })
  }

  /**
   * カテゴリが削除可能かチェック
   *
   * @param id カテゴリID
   * @returns 削除可能な場合true、デフォルトカテゴリの場合false
   */
  async canDelete(id: string): Promise<boolean> {
    const categories = await this.getAll()
    const category = categories[id]

    if (!category) {
      return false
    }

    return !category.isDefault
  }

  /**
   * カテゴリを参照しているプロンプト数を取得
   *
   * @param id カテゴリID
   * @returns プロンプト数
   */
  async getPromptCount(id: string): Promise<number> {
    const allPrompts = await promptsService.getAllPrompts()
    return allPrompts.filter((p) => p.categoryId === id).length
  }
}

export const categoryService = CategoryService.getInstance()
```

### 4.3.1 カテゴリ削除フロー

```
[カテゴリ削除リクエスト]
    ↓
[カテゴリ存在チェック]
    ├─ 存在しない → [エラー: Category not found]
    └─ 存在する
        ↓
[デフォルトカテゴリチェック]
    ├─ isDefault=true → [エラー: Cannot delete default category]
    └─ isDefault=false
        ↓
[削除前確認（UI）]
    - カテゴリ名を表示
    - 参照プロンプト数を表示（例: "このカテゴリを使用している3件のプロンプトがあります"）
    - ユーザーに確認
    ↓
[ユーザー確認]
    ├─ キャンセル → [削除中止]
    └─ OK
        ↓
[カテゴリ削除実行]
    1. categoriesStorageからカテゴリを削除
    2. 参照プロンプトのcategoryIdをnullに更新
        ↓
[完了通知]
    - 成功メッセージを表示
    - カテゴリリストを更新
```

### 4.3.2 カテゴリCRUD操作のUI仕様

**カテゴリ管理UI（設定画面内）**:

```
┌─────────────────────────────────────────────┐
│ カテゴリ管理                                │
│                                             │
│ ┌─────────────────────────────────────┐     │
│ │ [+] 新規カテゴリを追加              │     │
│ └─────────────────────────────────────┘     │
│                                             │
│ デフォルトカテゴリ:                         │
│ ┌─────────────────────────────────────┐     │
│ │ 📧 対外コミュニケーション  (5件)    │     │
│ │ 🏢 社内コミュニケーション  (3件)    │     │
│ │ 📄 ドキュメント作成        (8件)    │     │
│ │ 💻 開発・技術              (12件)   │     │
│ └─────────────────────────────────────┘     │
│                                             │
│ カスタムカテゴリ:                           │
│ ┌─────────────────────────────────────┐     │
│ │ 🎯 マーケティング  (2件)   [✏️] [🗑️] │     │
│ │ 🔬 リサーチ        (1件)   [✏️] [🗑️] │     │
│ └─────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

**操作仕様**:

1. **新規作成**:
   - [+] ボタンをクリック → インライン入力フィールド表示
   - カテゴリ名を入力（最大30文字）
   - Enter キーで確定、Esc でキャンセル

2. **リネーム**:
   - [✏️] アイコンをクリック → インライン編集モード
   - カテゴリ名を編集（最大30文字）
   - Enter キーで確定、Esc でキャンセル

3. **削除**:
   - [🗑️] アイコンをクリック → 確認ダイアログ表示
   - 参照プロンプト数を表示（例: "このカテゴリを使用している3件のプロンプトがあります"）
   - [キャンセル] / [削除] ボタン
   - 削除実行時、参照プロンプトのcategoryIdをnullに設定

4. **制約**:
   - デフォルトカテゴリはリネーム・削除不可（ボタン非表示）
   - カテゴリ名は必須、最大30文字
   - 予約語チェック（デフォルトカテゴリIDと衝突しないように）

**i18nキー**:

```typescript
// src/locales/en.yml
organizer:
  category:
    addNew: "Add new category"
    defaultCategories: "Default Categories"
    customCategories: "Custom Categories"
    rename: "Rename category"
    delete: "Delete category"
    deleteConfirm: "Delete this category? {count} prompts are using this category."
    deleteSuccess: "Category deleted successfully"
    cannotDeleteDefault: "Default categories cannot be deleted"
    nameRequired: "Category name is required"
    nameTooLong: "Category name must be 30 characters or less"

// src/locales/ja.yml
organizer:
  category:
    addNew: "新規カテゴリを追加"
    defaultCategories: "デフォルトカテゴリ"
    customCategories: "カスタムカテゴリ"
    rename: "カテゴリ名を変更"
    delete: "カテゴリを削除"
    deleteConfirm: "このカテゴリを削除しますか？{count}件のプロンプトがこのカテゴリを使用しています。"
    deleteSuccess: "カテゴリを削除しました"
    cannotDeleteDefault: "デフォルトカテゴリは削除できません"
    nameRequired: "カテゴリ名は必須です"
    nameTooLong: "カテゴリ名は30文字以内にしてください"
```

### 4.4 TemplateConverter

**責務**: テンプレート変換（Gemini APIレスポンス → 内部データ構造）

```typescript
/**
 * テンプレート変換サービス
 * Gemini APIのレスポンスを内部データ構造に変換
 */
class TemplateConverter {
  /**
   * GeneratedTemplateをTemplateCandidateに変換
   *
   * @param generated Gemini APIから生成されたテンプレート
   * @param periodDays フィルタ期間（日数）
   * @returns プレビュー用のテンプレート候補
   */
  convertToCandidate(
    generated: GeneratedTemplate,
    periodDays: number,
  ): TemplateCandidate {
    // ExtractedVariable[] → VariableConfig[] に変換
    const variables = generated.variables.map((v) =>
      this.convertToVariableConfig(v),
    )

    return {
      id: crypto.randomUUID(),
      title: generated.title,
      content: generated.content,
      useCase: generated.useCase,
      categoryId: generated.categoryId,
      variables,
      aiMetadata: {
        generatedAt: new Date(),
        sourcePromptIds: generated.sourcePromptIds,
        sourceCount: generated.sourcePromptIds.length,
        sourcePeriodDays: periodDays,
        extractedVariables: generated.variables, // 元のデータを保持
        confirmed: false,
        showInPinned: this.shouldShowInPinned(generated),
      },
      userAction: "pending",
    }
  }

  /**
   * ExtractedVariableをVariableConfigに変換
   *
   * @param extracted 抽出された変数
   * @returns VariableConfig形式の変数
   */
  private convertToVariableConfig(
    extracted: ExtractedVariable,
  ): VariableConfig {
    return {
      name: extracted.name,
      label: extracted.description || extracted.name,
      type: this.inferVariableType(extracted),
      defaultValue: "",
      required: true,
      options: undefined,
    }
  }

  /**
   * 変数の型を推論
   *
   * @param extracted 抽出された変数
   * @returns 推論された変数型
   */
  private inferVariableType(extracted: ExtractedVariable): VariableType {
    const nameLower = extracted.name.toLowerCase()
    const descLower = (extracted.description || "").toLowerCase()

    // 日付系
    if (nameLower.includes("date") || nameLower.includes("day")) {
      return "text"
    }

    // 複数行が必要そうな変数
    if (
      descLower.includes("詳細") ||
      descLower.includes("内容") ||
      descLower.includes("説明") ||
      nameLower.includes("detail") ||
      nameLower.includes("content") ||
      nameLower.includes("description")
    ) {
      return "textarea"
    }

    return "text"
  }

  /**
   * showInPinnedフラグの判定
   *
   * 基準:
   * - sourceCount >= 3（頻繁に使用）
   * - variables.length >= 2（汎用性が高い）
   *
   * @param generated 生成されたテンプレート
   * @returns Pinnedセクションに表示するかどうか
   */
  private shouldShowInPinned(generated: GeneratedTemplate): boolean {
    return (
      generated.sourcePromptIds.length >= 3 && generated.variables.length >= 2
    )
  }

  /**
   * TemplateCandidateをPromptに変換（保存時）
   *
   * @param candidate テンプレート候補
   * @returns 保存用のPrompt
   */
  convertToPrompt(candidate: TemplateCandidate): Prompt {
    return {
      id: crypto.randomUUID(),
      name: candidate.title,
      content: candidate.content,
      variables: candidate.variables, // VariableConfig[]をそのまま使用
      executionCount: 0,
      lastExecutedAt: new Date(),
      isPinned: candidate.userAction === "save_and_pin",
      lastExecutionUrl: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      isAIGenerated: true,
      aiMetadata: {
        ...candidate.aiMetadata,
        confirmed: true, // 保存時に確認済みとする
      },
      useCase: candidate.useCase,
      categoryId: candidate.categoryId,
    }
  }
}

export const templateConverter = new TemplateConverter()
```

**変数変換の詳細は `03_data_model.md` セクション1.4を参照。**

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
| `INVALID_API_KEY`  | API キー無効       | 設定画面へ誘導                   |

### 7.3 エラーリカバリーフローチャート

```
[API呼び出し]
    ↓
[エラー発生？]
    ↓ Yes
[エラー種別判定]
    ↓
├─ RATE_LIMIT / NETWORK_ERROR
│   ↓
│  [リトライ可能？（3回以内）]
│   ├─ Yes → [指数バックオフ待機（1秒、2秒、4秒）] → [リトライ]
│   └─ No  → [エラー表示ダイアログ]
│       - エラーメッセージ
│       - 手動リトライボタン
│
├─ QUOTA_EXCEEDED
│   ↓
│  [クォータ超過ダイアログ表示]
│   - タイトル: "API利用制限に達しました"
│   - メッセージ: 詳細説明
│   - アクション選択肢:
│     1. 待機してリトライ（推奨待機時間表示）
│     2. クォータ確認（Google AI Studioへのリンク）
│     3. プロンプト数を減らして再実行
│
├─ INVALID_API_KEY
│   ↓
│  [設定画面へ誘導ダイアログ]
│   - メッセージ: "APIキーが無効です"
│   - アクション:
│     1. 設定画面を開く（直接遷移）
│     2. APIキー取得方法のヘルプリンク
│
├─ INVALID_RESPONSE
│   ↓
│  [部分的成功チェック]
│   ├─ テンプレート1つ以上 → [警告付きで続行]
│   │   - 警告バナー表示
│   │   - 「期待より少ないテンプレートが生成されました」
│   │   - プレビュー画面へ進む
│   │
│   └─ テンプレート0件 → [エラーダイアログ]
│       - メッセージ: "テンプレートを生成できませんでした"
│       - アクション:
│         1. 条件を変更して再試行
│         2. 問題を報告（GitHubイシューリンク）
│
└─ API_ERROR（その他）
    ↓
   [一般エラーダイアログ表示]
    - エラーコードと詳細メッセージ
    - アクション:
      1. リトライボタン
      2. 問題を報告（GitHubイシューリンク）
      3. サポートドキュメントリンク
```

### 7.4 タイムアウト処理

```
[API呼び出し開始]
    ↓
[30秒タイマー開始]
    ↓
    ├─ 30秒以内に完了 → [正常処理]
    │
    └─ 30秒経過 → [タイムアウトエラー]
        ↓
       [タイムアウトダイアログ]
        - メッセージ: "処理がタイムアウトしました"
        - 原因の可能性:
          1. プロンプト数が多すぎる
          2. ネットワークが不安定
          3. Gemini APIの応答遅延
        - アクション:
          1. プロンプト数を減らして再試行
          2. ネットワーク接続を確認
          3. 時間をおいて再試行
```

### 7.5 統合エラーハンドリング実装例

```typescript
/**
 * PromptOrganizerService内でのエラーハンドリング
 */
async executeOrganization(
  settings: PromptOrganizerSettings
): Promise<PromptOrganizerResult> {
  try {
    // タイムアウト付きでリトライ実行
    const response = await executeWithRetry(
      () => withTimeout(
        this.callGeminiAPI(request),
        30000 // 30秒タイムアウト
      )
    )

    // レスポンス検証
    const { isValid, warnings } = validateResponse(response)

    if (!isValid) {
      throw {
        code: 'INVALID_RESPONSE',
        message: 'Invalid response: no templates generated',
      } as GeminiError
    }

    // 警告がある場合はログ出力（UI側で警告バナー表示）
    if (warnings.length > 0) {
      console.warn('Template generation warnings:', warnings)
    }

    return this.convertToResult(response, warnings)

  } catch (error) {
    // エラーにユーザーガイダンスを付加
    const enrichedError = enrichErrorWithGuidance(error as GeminiError)

    // UI側でエラーダイアログを表示
    throw enrichedError
  }
}
```

**エラーハンドリングの詳細実装は `05_api_design.md` セクション9を参照。**

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
