# データモデル設計

## 概要

プロンプト自動整理機能で使用するデータモデルの詳細定義。

**関連ドキュメント**:

- **02_architecture.md**: アーキテクチャ設計とサービス層設計
- **05_api_design.md**: Gemini API 統合の詳細実装

---

## 1. 型定義

### 1.1 Category（カテゴリ）

```typescript
/**
 * プロンプトのカテゴリ
 */
export interface Category {
  /** カテゴリID（UUID） */
  id: string

  /** カテゴリ名 */
  name: string

  /** カテゴリの説明（任意） */
  description?: string

  /** デフォルトカテゴリフラグ（プリセット） */
  isDefault: boolean

  /** 作成日時 */
  createdAt: Date

  /** 更新日時 */
  updatedAt: Date
}
```

**デフォルトカテゴリ（i18n 対応）**:

翻訳キー:

- `organizer.category.externalCommunication`: 対外コミュニケーション / External Communication
- `organizer.category.internalCommunication`: 社内コミュニケーション / Internal Communication
- `organizer.category.documentCreation`: ドキュメント作成 / Document Creation
- `organizer.category.development`: 開発・技術 / Development & Tech
- `organizer.category.other`: その他 / Other

### 1.2 Prompt 型の拡張

既存の Prompt 型に以下のフィールドを追加：

```typescript
export interface Prompt {
  // ... 既存フィールド
  id: string
  name: string
  content: string
  executionCount: number
  lastExecutedAt: Date
  isPinned: boolean
  lastExecutionUrl: string
  createdAt: Date
  updatedAt: Date
  variables?: VariableConfig[]

  // ===== 新規追加フィールド =====

  /** AI自動作成フラグ */
  isAIGenerated?: boolean

  /** AI生成メタデータ */
  aiMetadata?: AIGeneratedMetadata

  /** ユースケース（状況＋目的の説明、最大40文字） */
  useCase?: string

  /** カテゴリID */
  categoryId?: string
}

/**
 * ストレージ保存用のPrompt型
 * createdAt/updatedAtは文字列（ISO 8601形式）で保存
 */
export interface StoredPrompt extends Omit<Prompt, 'createdAt' | 'updatedAt'> {
  createdAt: string  // ISO 8601形式の日時文字列
  updatedAt: string  // ISO 8601形式の日時文字列

  // 新規追加フィールド（すべてOptional、既存プロンプトとの互換性を保つ）
  isAIGenerated?: boolean      // デフォルト: undefined（通常プロンプト）
  aiMetadata?: AIGeneratedMetadata
  useCase?: string
  categoryId?: string
}
```

### 1.3 AIGeneratedMetadata

```typescript
/**
 * AI自動作成プロンプトのメタデータ
 */
export interface AIGeneratedMetadata {
  /** 生成日時 */
  generatedAt: Date

  /** 参照元プロンプトID一覧 */
  sourcePromptIds: string[]

  /** 参照元プロンプト件数 */
  sourceCount: number

  /** 参照元プロンプトの期間（日数） */
  sourcePeriodDays: number

  /** 抽出された変数情報 */
  extractedVariables: ExtractedVariable[]

  /** ユーザー確認済みフラグ（未確認=false, 確認済み=true） */
  confirmed: boolean

  /** Pinned表示対象フラグ（セクションBに表示するか） */
  showInPinned: boolean
}

/**
 * 抽出された変数の情報
 */
export interface ExtractedVariable {
  /** 変数名 */
  name: string

  /** 変数の説明（Geminiが生成） */
  description?: string
}
```

### 1.4 PromptOrganizerSettings（自動整理設定）

```typescript
/**
 * プロンプト自動整理の設定
 */
export interface PromptOrganizerSettings {
  /** 自動整理機能の有効/無効 */
  enabled: boolean

  /** 整理方法を定義するプロンプト（ユーザーがカスタマイズ可能） */
  organizationPrompt: string

  /** 絞り込み条件: 最終実行時期（日数） */
  filterPeriodDays: number

  /** 絞り込み条件: 最低実行回数 */
  filterMinExecutionCount: number

  /** 絞り込み条件: 読み込み件数上限 */
  filterMaxPrompts: number

  /** 最終実行日時（最後に整理を実行した日時） */
  lastExecutedAt?: Date
}
```

**デフォルト値** (`src/services/promptOrganizer/defaultPrompts.ts` で定義):

```typescript
/**
 * システムインストラクション（固定、ユーザー編集不可）
 *
 * AI の役割と基本ルールを定義。
 * Prompt Improver の SYSTEM_INSTRUCTION と同様に、
 * AI の基本的な振る舞いを制御する固定プロンプト。
 *
 * 注意: このシステムインストラクションは、GeminiClientのconfig.systemInstructionパラメータで
 * 渡されます。プロンプトテキストには含めないでください。
 */
export const SYSTEM_INSTRUCTION = `You are an expert prompt organizer assistant.
Your role is to analyze user's prompt history and create reusable templates.

CRITICAL RULES:
- You must ONLY output structured JSON in the specified schema
- Extract common patterns and identify variable parts (names, dates, values)
- Create templates with {{variable_name}} format for dynamic content
- Assign appropriate use cases and categories to each template
- Focus on creating practical, reusable templates`

/**
 * デフォルト整理プロンプト（ユーザーがカスタマイズ可能）
 *
 * 整理方法の詳細指示を定義。
 * ユーザーが設定画面で編集可能。
 */
export const DEFAULT_ORGANIZATION_PROMPT = `Analyze and organize the following user prompts using these guidelines:

1. **Grouping**: Group similar prompts by purpose and structure
2. **Pattern Extraction**: Identify common patterns within each group
3. **Variable Identification**: Replace variable parts with {{variable_name}} format
   - Examples: customer names, dates, numbers, specific content
4. **Template Creation**: Create concise, reusable templates
5. **Use Case Definition**: Describe when to use each template (max 40 chars)
6. **Category Assignment**: Select or suggest appropriate categories

Prioritization:
- Focus on frequently executed prompts
- Prioritize prompts with clear reusability
- Exclude one-time or highly specific prompts`

export const DEFAULT_ORGANIZER_SETTINGS: PromptOrganizerSettings = {
  enabled: false,
  organizationPrompt: DEFAULT_ORGANIZATION_PROMPT,
  filterPeriodDays: 30,
  filterMinExecutionCount: 0,
  filterMaxPrompts: 100,
}
```

---

## 2. Gemini API 関連の型定義

### 2.1 OrganizePromptsRequest（整理リクエスト）

```typescript
/**
 * Gemini API へのプロンプト整理リクエスト
 * （内部処理用の型定義）
 */
export interface OrganizePromptsRequest {
  /** 整理方法を定義するプロンプト（ユーザーがカスタマイズ可能） */
  organizationPrompt: string

  /** 対象プロンプト一覧（JSON形式） */
  prompts: PromptForOrganization[]

  /** 既存カテゴリ一覧 */
  existingCategories: Category[]
}

/**
 * 注意: システムインストラクション（SYSTEM_INSTRUCTION）は
 * 固定値として `src/services/promptOrganizer/defaultPrompts.ts` で定義され、
 * GeminiClient 呼び出し時に systemInstruction パラメータとして渡されます。
 */

/**
 * 整理用のプロンプトデータ（最小限の情報のみ）
 */
export interface PromptForOrganization {
  /** プロンプトID */
  id: string

  /** プロンプト内容 */
  content: string

  /** 実行回数 */
  executionCount: number

  /** 最終実行日時 */
  lastExecutedAt: string // ISO 8601 形式
}
```

### 2.2 OrganizePromptsResponse（整理レスポンス）

```typescript
/**
 * Gemini API からのプロンプト整理レスポンス
 */
export interface OrganizePromptsResponse {
  /** 生成されたテンプレート一覧 */
  templates: GeneratedTemplate[]
}

/**
 * Gemini が生成したテンプレート
 */
export interface GeneratedTemplate {
  /** テンプレート名（20文字以内） */
  title: string

  /** テンプレート本文（変数化済み） */
  content: string

  /** ユースケース（最大40文字） */
  useCase: string

  /** カテゴリID（既存カテゴリのIDまたは null） */
  categoryId: string | null

  /** 新規カテゴリ名（既存カテゴリにマッチしない場合） */
  newCategoryName?: string

  /** 新規カテゴリの説明 */
  newCategoryDescription?: string

  /** 抽出された変数一覧 */
  variables: ExtractedVariable[]

  /** 参照元プロンプトID一覧 */
  sourcePromptIds: string[]
}
```

---

## 3. UI/プレビュー用の型定義

### 3.1 PromptOrganizerResult（整理実行結果）

```typescript
/**
 * プロンプト整理の実行結果（サマリ表示用）
 */
export interface PromptOrganizerResult {
  /** 生成されたテンプレート候補 */
  templates: TemplateCandidate[]

  /** 参照したプロンプト件数 */
  sourceCount: number

  /** 参照したプロンプトの期間（日数） */
  periodDays: number

  /** 実行日時 */
  executedAt: Date

  /** 入力トークン数 */
  inputTokens: number

  /** 出力トークン数 */
  outputTokens: number

  /** 概算コスト（円） */
  estimatedCost: number
}
```

### 3.2 TemplateCandidate（テンプレート候補）

```typescript
/**
 * プレビュー用のテンプレート候補
 */
export interface TemplateCandidate {
  /** 候補ID（一時的なID） */
  id: string

  /** テンプレート名 */
  title: string

  /** テンプレート本文 */
  content: string

  /** ユースケース */
  useCase: string

  /** カテゴリID（編集可能） */
  categoryId: string | null

  /** 抽出された変数（VariableConfig形式に変換済み） */
  variables: VariableConfig[]

  /** AI生成メタデータ */
  aiMetadata: AIGeneratedMetadata

  /** ユーザーの選択状態 */
  userAction: "pending" | "save" | "save_and_pin" | "discard"
}
```

### 3.3 OrganizerExecutionEstimate（実行前の見積もり）

```typescript
/**
 * 整理実行前のコスト見積もり
 */
export interface OrganizerExecutionEstimate {
  /** 対象プロンプト件数 */
  targetPromptCount: number

  /** 想定入力トークン数 */
  estimatedInputTokens: number

  /** コンテキスト使用率（0.0 〜 1.0） */
  contextUsageRate: number

  /** 概算コスト（円） */
  estimatedCost: number

  /** 使用モデル */
  model: string

  /** コンテキスト上限 */
  contextLimit: number
}
```

---

## 4. ストレージ定義

### 4.1 新規ストレージ

```typescript
/**
 * カテゴリ一覧のストレージ
 *
 * デフォルトカテゴリは別ファイルで定義された定数を使用:
 * src/services/promptOrganizer/defaultCategories.ts
 */
export const categoriesStorage = storage.defineItem<Record<string, Category>>(
  'local:categories',
  {
    fallback: DEFAULT_CATEGORIES, // デフォルトカテゴリをfallbackで初期化
    version: 1,
    migrations: {},
  },
)

/**
 * プロンプト自動整理設定のストレージ
 */
export const promptOrganizerSettingsStorage =
  storage.defineItem<PromptOrganizerSettings>("local:promptOrganizerSettings", {
    fallback: DEFAULT_ORGANIZER_SETTINGS,
    version: 1,
    migrations: {},
  })
```

### 4.2 デフォルトカテゴリ定義

デフォルトカテゴリは `src/services/promptOrganizer/defaultCategories.ts` で定義します：

```typescript
// src/services/promptOrganizer/defaultCategories.ts

import type { Category } from '@/types/prompt'

/**
 * デフォルトカテゴリ定数
 * ストレージのfallback値として使用
 */
export const DEFAULT_CATEGORIES: Record<string, Category> = {
  'external-communication': {
    id: 'external-communication',
    name: 'organizer.category.externalCommunication',
    isDefault: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  'internal-communication': {
    id: 'internal-communication',
    name: 'organizer.category.internalCommunication',
    isDefault: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  'document-creation': {
    id: 'document-creation',
    name: 'organizer.category.documentCreation',
    isDefault: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  'development': {
    id: 'development',
    name: 'organizer.category.development',
    isDefault: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  'other': {
    id: 'other',
    name: 'organizer.category.other',
    isDefault: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
}
```

**カテゴリID一覧**:
- `external-communication`: 対外コミュニケーション
- `internal-communication`: 社内コミュニケーション
- `document-creation`: ドキュメント作成
- `development`: 開発・技術
- `other`: その他

### 4.3 既存 Prompt ストレージの拡張

既存の `promptsStorage` は変更不要（Prompt 型の拡張で自動的に対応）。

---

## 5. データフロー

### 5.1 整理実行フロー

```
[ユーザー操作]
  ↓
[設定ダイアログで条件指定]
  ↓
[対象プロンプト抽出]
  prompts.filter(絞り込み条件)
  ↓
[トークン数・コスト見積もり]
  estimateTokens() → OrganizerExecutionEstimate
  ↓
[Gemini API 呼び出し]
  OrganizePromptsRequest → Gemini API → OrganizePromptsResponse
  ↓
[レスポンスをテンプレート候補に変換]
  GeneratedTemplate[] → TemplateCandidate[]
  ↓
[プレビュー画面表示]
  PromptOrganizerResult
  ↓
[ユーザーが編集・選択]
  userAction: 'save' | 'save_and_pin' | 'discard'
  ↓
[選択されたテンプレートを保存]
  PromptsService.savePrompt() with isAIGenerated=true
  PinsService.pinPrompt() (if save_and_pin)
```

### 5.2 カテゴリ管理フロー

```
[初回起動時]
  ↓
[デフォルトカテゴリ初期化]
  initializeDefaultCategories()
  ↓
[ストレージに保存]
  categoriesStorage.setValue()

[Gemini レスポンス処理時]
  ↓
[既存カテゴリにマッチ？]
  Yes → 既存カテゴリIDを使用
  No  → 新規カテゴリ作成
  ↓
[カテゴリ一覧を更新]
  categoriesStorage.setValue()
```

---

## 6. データ整合性

### 6.1 制約事項

1. **カテゴリ参照整合性**
   - `Prompt.categoryId` は `Category.id` を参照
   - カテゴリ削除時は、該当プロンプトの `categoryId` を null に設定

2. **AI生成プロンプトの識別**
   - `isAIGenerated === true` の場合、`aiMetadata` は必須
   - `aiMetadata.sourcePromptIds` は削除されたプロンプトを含む可能性あり（履歴保持）

3. **変数の整合性**
   - `aiMetadata.extractedVariables` と `variables` は同期
   - ユーザーが変数設定を編集した場合も `extractedVariables` は保持（履歴として）

### 6.2 マイグレーション戦略

既存データとの互換性を保つため、新規フィールドはすべてOptionalとします：

```typescript
// Prompt 型の拡張フィールドはすべて Optional
isAIGenerated?: boolean  // undefined = 通常プロンプト（既存プロンプト）
aiMetadata?: AIGeneratedMetadata
useCase?: string
categoryId?: string
```

**promptsStorageのマイグレーション例**:

```typescript
// src/services/storage/definitions.ts にマイグレーションバージョン2を追加

export const promptsStorage = storage.defineItem<StoredPrompt[]>('local:prompts', {
  fallback: [],
  version: 2, // バージョンを2に更新
  migrations: {
    // バージョン1→2: 新規フィールドの追加
    // 注意: 新規フィールドはすべてOptionalのため、
    // 既存プロンプトは undefined のままで問題なく動作します
    2: (oldPrompts: StoredPrompt[]) => {
      return oldPrompts.map(prompt => ({
        ...prompt,
        // 新規フィールドは明示的に undefined を設定
        // （既存プロンプトは通常プロンプトとして扱う）
        isAIGenerated: prompt.isAIGenerated ?? undefined,
        aiMetadata: prompt.aiMetadata ?? undefined,
        useCase: prompt.useCase ?? undefined,
        categoryId: prompt.categoryId ?? undefined,
      }))
    },
  },
})
```

**マイグレーションの動作**:
- 既存プロンプトには新規フィールドが追加されないため、データサイズは変わりません
- 新規フィールドが `undefined` の場合、通常プロンプトとして扱われます
- AI生成プロンプトのみ `isAIGenerated: true` が設定されます

---

## 7. パフォーマンス考慮

### 7.1 データサイズ

- **1テンプレートあたりの想定サイズ**: 2KB 〜 5KB
  - メタデータ: 500B 〜 1KB
  - 本文: 1KB 〜 3KB
  - 変数設定: 500B 〜 1KB

- **カテゴリ数の想定**: 10 〜 30件
  - デフォルト: 5件
  - ユーザー追加: 5 〜 25件

### 7.2 インデックス戦略

以下の条件で効率的にフィルタリング：

- `isAIGenerated === true` でAI生成プロンプトを抽出
- `aiMetadata.confirmed === false` で未確認プロンプトを抽出
- `aiMetadata.showInPinned === true` でPinnedセクションB対象を抽出
- `categoryId` でカテゴリごとに分類

---

## 8. セキュリティ考慮

### 8.1 Gemini API への送信データ

- **最小限の情報のみ送信**: `PromptForOrganization`
  - ID, content, executionCount, lastExecutedAt のみ
  - 個人情報が含まれる可能性のある `name` は送信しない

### 8.2 ユーザー確認フロー

- すべてのテンプレート候補は一度プレビュー画面を経由
- ユーザーが明示的に保存アクションを行うまで永続化しない
- 生成されたテンプレートの内容を確認・編集可能

---

## 9. エラーハンドリング

### 9.1 Gemini API エラー

```typescript
/**
 * Gemini API エラーレスポンス
 */
export interface OrganizerError {
  /** エラーコード */
  code: "API_ERROR" | "NETWORK_ERROR" | "QUOTA_EXCEEDED" | "INVALID_RESPONSE"

  /** エラーメッセージ */
  message: string

  /** 詳細情報 */
  details?: any
}
```

### 9.2 データ検証

- Gemini レスポンスの構造化出力が期待する形式か検証
- 変数名の妥当性チェック（既存の `isValidVariableName()` を使用）
- テンプレート名の長さチェック（20文字以内）
- ユースケースの長さチェック（40文字以内）
