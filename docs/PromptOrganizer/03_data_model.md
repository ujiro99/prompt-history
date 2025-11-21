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

  /**
   * Pinned表示対象フラグ（セクションBに表示するか）
   *
   * 自動決定基準:
   * - sourceCount >= 3 AND variables.length >= 2
   *
   * この基準を満たすテンプレートは「汎用性が高い」と判断され、
   * PinnedメニューのAIレコメンデーションセクションに自動表示されます。
   *
   * ユーザーは手動でピン留め/ピン解除を行うこともできます。
   *
   * @default false - デフォルトは非表示
   */
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

### 1.4 変数の変換と統合

#### ExtractedVariable から VariableConfig への変換

Gemini APIが返す`ExtractedVariable`を既存の`VariableConfig`形式に変換します：

```typescript
/**
 * ExtractedVariableをVariableConfigに変換
 *
 * @param extracted Gemini APIから抽出された変数
 * @returns 既存の変数展開機能で使用できるVariableConfig
 */
function convertToVariableConfig(
  extracted: ExtractedVariable
): VariableConfig {
  return {
    name: extracted.name,
    label: extracted.description || extracted.name, // 説明をラベルとして使用
    type: inferVariableType(extracted),              // 型を推論
    defaultValue: '',                                // デフォルト値は空
    required: true,                                  // AI抽出変数は必須とする
    options: undefined,                              // セレクト型の場合は後で設定
  }
}

/**
 * 変数の型を推論
 *
 * 推論ルール:
 * - 名前に "date" を含む → 'text' (日付入力)
 * - 説明に改行を含む可能性を示唆 → 'textarea'
 * - それ以外 → 'text' (デフォルト)
 *
 * @param extracted 抽出された変数
 * @returns 推論された変数型
 */
function inferVariableType(extracted: ExtractedVariable): VariableType {
  const nameLower = extracted.name.toLowerCase()
  const descLower = (extracted.description || '').toLowerCase()

  // 日付系
  if (nameLower.includes('date') || nameLower.includes('day')) {
    return 'text' // HTMLのdate inputは使わず、textで自由入力
  }

  // 複数行が必要そうな変数
  if (
    descLower.includes('詳細') ||
    descLower.includes('内容') ||
    descLower.includes('説明') ||
    nameLower.includes('detail') ||
    nameLower.includes('content') ||
    nameLower.includes('description')
  ) {
    return 'textarea'
  }

  // デフォルトは単一行テキスト
  return 'text'
}
```

#### 既存の変数展開機能との統合

AI生成プロンプトの変数は、既存の変数展開ダイアログで入力されます：

**1. 保存時の処理**:

```typescript
/**
 * TemplateCandidateをPromptに変換
 */
function convertCandidateToPrompt(
  candidate: TemplateCandidate
): Prompt {
  return {
    id: crypto.randomUUID(),
    name: candidate.title,
    content: candidate.content,
    variables: candidate.variables, // VariableConfig[] をそのまま使用
    isAIGenerated: true,
    aiMetadata: candidate.aiMetadata,
    useCase: candidate.useCase,
    categoryId: candidate.categoryId,
    executionCount: 0,
    lastExecutedAt: new Date(),
    isPinned: candidate.userAction === 'save_and_pin',
    lastExecutionUrl: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}
```

**2. 実行時の処理**:

- AI生成プロンプトも通常のプロンプトと同様に変数展開ダイアログが表示される
- `variables`配列に基づいてダイアログのフォームが生成される
- ユーザーが入力した値で`{{variable_name}}`が置換される

**3. 変数の編集**:

- ユーザーはプロンプト編集画面で変数設定を変更可能
- 変更しても`aiMetadata.extractedVariables`は保持される（AI抽出時の履歴として）
- 変数の追加・削除・型変更が可能

#### 変数デフォルト値の設定

AI抽出時はデフォルト値が空ですが、ユーザーが後から設定可能：

```typescript
/**
 * 変数設定の編集（既存機能を活用）
 */
interface VariableConfigEditor {
  // 既存の変数編集UIを使用
  editVariable(promptId: string, variableName: string): void

  // 編集内容
  updateVariableConfig(config: {
    name: string
    label: string
    type: VariableType
    defaultValue: string    // ユーザーが頻繁に使う値を設定
    required: boolean
    options?: string[]      // type='select'の場合の選択肢
  }): void
}
```

#### 変数入力ダイアログの動作仕様

既存の変数展開機能と完全に統合：

**1. ダイアログ表示条件**:

- プロンプト実行時に`variables`配列が存在し、かつ空でない場合
- AI生成プロンプトも通常プロンプトも同じロジック

**2. フォーム生成**:

- `variables`配列を順番に処理
- 各変数の`type`に応じたフォームコントロールを表示
  - `text`: `<input type="text">`
  - `textarea`: `<textarea>`
  - `select`: `<select>` with `options`

**3. デフォルト値の適用**:

- `defaultValue`が設定されている場合、初期値として表示
- ユーザーは変更可能

**4. バリデーション**:

- `required: true`の変数は入力必須
- 未入力の場合はエラー表示

**5. 実行**:

- すべての必須変数が入力されたら実行可能
- 入力値で`{{variable_name}}`を置換してAIサービスに送信

#### データフロー例

```
[AIがテンプレート生成]
  GeneratedTemplate {
    variables: [
      { name: 'client_name', description: '取引先名' },
      { name: 'issue', description: '発生した問題の詳細' }
    ]
  }
  ↓
[変数変換]
  convertToVariableConfig() を各変数に適用
  ↓
  TemplateCandidate {
    variables: [
      { name: 'client_name', label: '取引先名', type: 'text', required: true },
      { name: 'issue', label: '発生した問題の詳細', type: 'textarea', required: true }
    ]
  }
  ↓
[ユーザーが保存]
  convertCandidateToPrompt()
  ↓
  Prompt {
    content: '{{client_name}}様\n{{issue}}について...',
    variables: [...] // VariableConfig[]
    isAIGenerated: true
  }
  ↓
[ユーザーが実行]
  既存の変数展開ダイアログ表示
  ↓
  ユーザー入力:
    client_name: 'ABC株式会社'
    issue: '納品遅延'
  ↓
  置換実行:
    'ABC株式会社様\n納品遅延について...'
  ↓
  AIサービスに送信
```

### 1.5 PromptOrganizerSettings（自動整理設定）

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

### 9.2 入力検証仕様

#### 9.2.1 Gemini APIレスポンスの検証

**構造化出力の検証**:

```typescript
/**
 * Gemini APIレスポンスの検証ルール
 */
interface ResponseValidationRules {
  // 必須フィールドの存在チェック
  requiredFields: ['templates']

  // テンプレート配列の検証
  templates: {
    minLength: 0              // 最小0件（エラー時のため）
    maxLength: 20             // 最大20件
  }
}

/**
 * レスポンス検証関数
 */
function validateGeminiResponse(
  response: OrganizePromptsResponse
): ValidationResult {
  const errors: string[] = []

  // templates配列の存在チェック
  if (!Array.isArray(response.templates)) {
    errors.push('templates field must be an array')
  }

  // 各テンプレートの検証
  response.templates.forEach((template, index) => {
    const templateErrors = validateTemplate(template, index)
    errors.push(...templateErrors)
  })

  return {
    isValid: errors.length === 0,
    errors,
  }
}
```

#### 9.2.2 テンプレートフィールドの検証

```typescript
/**
 * テンプレートフィールドの検証ルール
 */
const TEMPLATE_VALIDATION_RULES = {
  title: {
    maxLength: 20,
    trimWhitespace: true,
    errorKey: 'organizer.validation.titleTooLong',
  },
  useCase: {
    maxLength: 40,
    trimWhitespace: true,
    errorKey: 'organizer.validation.useCaseTooLong',
  },
  content: {
    required: true,
    minLength: 1,
    errorKey: 'organizer.validation.contentRequired',
  },
  categoryId: {
    // 既存カテゴリIDまたは新規カテゴリ名
    validateExistence: true,
    errorKey: 'organizer.validation.invalidCategory',
  },
  sourcePromptIds: {
    required: true,
    minLength: 1,
    errorKey: 'organizer.validation.noSourcePrompts',
  },
} as const

/**
 * テンプレート検証関数
 */
function validateTemplate(
  template: GeneratedTemplate,
  index: number
): string[] {
  const errors: string[] = []

  // タイトルの検証
  if (!template.title) {
    errors.push(`Template ${index + 1}: title is required`)
  } else if (template.title.length > TEMPLATE_VALIDATION_RULES.title.maxLength) {
    // 超過時は自動で切り詰め（エラーではなく警告）
    console.warn(
      `Template ${index + 1}: title truncated from ${template.title.length} to ${TEMPLATE_VALIDATION_RULES.title.maxLength} chars`
    )
    template.title = template.title.slice(0, TEMPLATE_VALIDATION_RULES.title.maxLength)
  }

  // ユースケースの検証
  if (template.useCase && template.useCase.length > TEMPLATE_VALIDATION_RULES.useCase.maxLength) {
    console.warn(
      `Template ${index + 1}: useCase truncated from ${template.useCase.length} to ${TEMPLATE_VALIDATION_RULES.useCase.maxLength} chars`
    )
    template.useCase = template.useCase.slice(0, TEMPLATE_VALIDATION_RULES.useCase.maxLength)
  }

  // コンテンツの検証
  if (!template.content || template.content.trim().length === 0) {
    errors.push(`Template ${index + 1}: content is required`)
  }

  // ソースプロンプトIDの検証
  if (!template.sourcePromptIds || template.sourcePromptIds.length === 0) {
    errors.push(`Template ${index + 1}: at least one source prompt ID is required`)
  }

  return errors
}
```

#### 9.2.3 変数名の検証

```typescript
/**
 * 変数名の検証ルール
 */
const VARIABLE_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/**
 * 変数名の妥当性チェック
 *
 * @param name 変数名
 * @returns 有効な変数名の場合 true
 */
function isValidVariableName(name: string): boolean {
  // 既存の実装を使用
  return VARIABLE_NAME_PATTERN.test(name)
}

/**
 * 変数の検証
 */
function validateVariable(
  variable: ExtractedVariable,
  templateIndex: number,
  variableIndex: number
): string[] {
  const errors: string[] = []

  // 変数名の存在チェック
  if (!variable.name) {
    errors.push(
      `Template ${templateIndex + 1}, Variable ${variableIndex + 1}: name is required`
    )
    return errors
  }

  // 変数名のパターンチェック
  if (!isValidVariableName(variable.name)) {
    errors.push(
      `Template ${templateIndex + 1}, Variable ${variableIndex + 1}: ` +
      `invalid variable name "${variable.name}". ` +
      `Must match pattern: ${VARIABLE_NAME_PATTERN}`
    )
  }

  return errors
}
```

#### 9.2.4 カテゴリ名の検証

```typescript
/**
 * カテゴリ名の検証ルール
 */
const CATEGORY_VALIDATION_RULES = {
  name: {
    maxLength: 30,
    trimWhitespace: true,
    errorKey: 'organizer.validation.categoryNameTooLong',
  },
  // 予約語チェック（デフォルトカテゴリIDとの衝突を防ぐ）
  reservedNames: [
    'external-communication',
    'internal-communication',
    'document-creation',
    'development',
  ],
} as const

/**
 * カテゴリ名の検証
 */
function validateCategoryName(name: string): ValidationResult {
  const errors: string[] = []

  // 長さチェック
  if (name.length > CATEGORY_VALIDATION_RULES.name.maxLength) {
    errors.push(
      `Category name too long (max ${CATEGORY_VALIDATION_RULES.name.maxLength} chars)`
    )
  }

  // 予約語チェック
  if (CATEGORY_VALIDATION_RULES.reservedNames.includes(name.toLowerCase())) {
    errors.push(`Category name "${name}" is reserved`)
  }

  // 空文字チェック
  if (name.trim().length === 0) {
    errors.push('Category name cannot be empty')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
```

#### 9.2.5 サニタイゼーション

```typescript
/**
 * テンプレートデータのサニタイゼーション
 *
 * XSS攻撃を防ぐため、HTMLタグをエスケープします。
 * ただし、変数構文 {{variableName}} は保持します。
 */
function sanitizeTemplateContent(content: string): string {
  // 変数構文を一時的に保護
  const variablePlaceholders: string[] = []
  let sanitized = content.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    const placeholder = `__VAR_${variablePlaceholders.length}__`
    variablePlaceholders.push(match)
    return placeholder
  })

  // HTMLエスケープ（基本的なもののみ）
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')

  // 変数構文を復元
  variablePlaceholders.forEach((variable, index) => {
    sanitized = sanitized.replace(`__VAR_${index}__`, variable)
  })

  return sanitized
}

/**
 * 文字列のトリミングと正規化
 */
function normalizeString(str: string): string {
  return str
    .trim()                           // 前後の空白を削除
    .replace(/\s+/g, ' ')            // 連続する空白を1つに
    .replace(/[\r\n]+/g, '\n')       // 連続する改行を1つに
}
```

#### 9.2.6 検証エラーメッセージ

**i18nキー定義**:

```typescript
// src/locales/en.yml
organizer:
  validation:
    titleTooLong: "Template title must be 20 characters or less"
    useCaseTooLong: "Use case must be 40 characters or less"
    contentRequired: "Template content is required"
    invalidCategory: "Invalid category"
    noSourcePrompts: "At least one source prompt is required"
    categoryNameTooLong: "Category name must be 30 characters or less"
    invalidVariableName: "Variable name contains invalid characters"
    variableNameRequired: "Variable name is required"

// src/locales/ja.yml
organizer:
  validation:
    titleTooLong: "テンプレート名は20文字以内にしてください"
    useCaseTooLong: "ユースケースは40文字以内にしてください"
    contentRequired: "テンプレートの内容は必須です"
    invalidCategory: "無効なカテゴリです"
    noSourcePrompts: "少なくとも1つのソースプロンプトが必要です"
    categoryNameTooLong: "カテゴリ名は30文字以内にしてください"
    invalidVariableName: "変数名に無効な文字が含まれています"
    variableNameRequired: "変数名は必須です"
```

#### 9.2.7 統合された検証フロー

```typescript
/**
 * テンプレート候補の完全検証
 */
async function validateTemplateCandidate(
  candidate: TemplateCandidate
): Promise<ValidationResult> {
  const errors: string[] = []

  // 1. 基本フィールドの検証
  const basicValidation = validateTemplate(candidate, 0)
  errors.push(...basicValidation)

  // 2. 変数の検証
  candidate.variables?.forEach((variable, index) => {
    const varErrors = validateVariable(
      { name: variable.name, description: variable.label },
      0,
      index
    )
    errors.push(...varErrors)
  })

  // 3. カテゴリの検証（新規カテゴリの場合）
  if (candidate.categoryId && !isExistingCategoryId(candidate.categoryId)) {
    const categoryValidation = validateCategoryName(candidate.categoryId)
    errors.push(...categoryValidation.errors)
  }

  // 4. コンテンツのサニタイゼーション（副作用あり）
  candidate.content = sanitizeTemplateContent(candidate.content)
  candidate.title = normalizeString(candidate.title)
  if (candidate.useCase) {
    candidate.useCase = normalizeString(candidate.useCase)
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
```
