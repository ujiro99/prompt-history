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
src/services/genai/
  └── defaultPrompts.ts             # システムインストラクション、デフォルト設定
src/services/promptOrganizer/
  ├── PromptOrganizerService.ts    # メインサービス
  ├── CategoryService.ts            # カテゴリ管理
  └── defaultCategories.ts          # デフォルトカテゴリ定数（新規）
```

### 1.2 システム全体構成図

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer (React)                     │
├─────────────────────────────────────────────────────────┤
│  InputPopup (既存 - 拡張)                               │
│   ├─ HistoryMenu                                        │
│   ├─ PinnedMenu (拡張)                                  │
│   │   ├─ Section A: ユーザーピン留め                    │
│   │   └─ Section B: AIおすすめテンプレ (New)            │
│   ├─ ImproveMenu (拡張: サブメニュー化)                 │
│   │   ├─ Prompt Improver (既存)                         │
│   │   └─ Organize Prompts (New) → 実行ダイアログ        │
│   └─ SettingsMenu (拡張)                                │
│       └─ Prompt Organizer Settings → 設定ダイアログ     │
│                                                         │
│  Organizer Dialogs (New)                                │
│   ├─ 実行ダイアログ (PromptOrganizerExecuteDialog)      │
│   ├─ 設定ダイアログ (OrganizerSettingsDialog)           │
│   ├─ サマリダイアログ (OrganizerSummaryDialog)          │
│   └─ プレビューダイアログ (OrganizerPreviewDialog)      │
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
│   ├── inputMenu/
│   │   ├── InputPopup.tsx (拡張 - ImproveMenuをサブメニュー化)
│   │   ├── PromptList.tsx (拡張)
│   │   └── SettingsMenu.tsx (拡張)
│   └── promptOrganizer/ (New)
│       ├── OrganizerExecuteDialog.tsx (New - 実行専用)
│       ├── OrganizerSettingsDialog.tsx (New - 設定専用)
│       ├── OrganizerSummaryDialog.tsx
│       ├── OrganizerPreviewDialog.tsx
│       ├── TemplateCandidateCard.tsx
│       └── CategorySelector.tsx
│
├── services/
│   ├── genai/ (既存)
│   │   ├── GeminiClient.ts (拡張 - 構造化出力メソッド追加)
│   │   ├── types.ts (拡張)
│   │   └── defaultPrompts.ts (拡張 - Prompt Improverと共用)
│   │
│   ├── promptOrganizer/ (New)
│   │   ├── PromptOrganizerService.ts
│   │   ├── CategoryService.ts
│   │   ├── PromptFilterService.ts
│   │   ├── defaultCategories.ts (New - デフォルトカテゴリ定数)
│   │   └── TemplateConverter.ts
│   │
│   └── storage/
│       ├── prompts.ts (既存 - 変更なし)
│       ├── pins.ts (既存 - 変更なし)
│       ├── categories.ts (New)
│       ├── definitions.ts (拡張)
│       └── index.ts (拡張)
│
├── types/
│   ├── prompt.ts (拡張)
│   └── organizer.ts (New)
│
├── utils/
│   └── organizer/ (New)
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

**エントリーポイントの二重化**:

- **Improve Menu → "Organize Prompts"**: 即座に実行したいユーザー向け（ExecuteDialog）
- **Settings Menu → "Prompt Organizer Settings"**: 詳細設定を変更したいユーザー向け（SettingsDialog）

```
OrganizerExecuteDialog (実行専用)
  ├─ DialogHeader
  ├─ ExecutionEstimateDisplay
  │   ├─ TargetPromptsCount
  │   ├─ TokenCountDisplay
  │   ├─ ContextUsageBar
  │   └─ CostEstimate
  ├─ SettingsChangeNotice (設定メニューへの誘導)
  └─ DialogFooter
      ├─ CancelButton
      └─ ExecuteButton

OrganizerSettingsDialog (設定専用)
  ├─ DialogHeader
  ├─ FilterConditionsSection
  │   ├─ PeriodSelector (1週/1ヶ月/1年)
  │   ├─ ExecutionCountInput
  │   └─ MaxPromptsInput
  ├─ OrganizationPromptSection
  │   ├─ OrganizationPromptEditor (Textareaラッパー)
  │   └─ ResetToDefaultButton
  └─ DialogFooter
      ├─ CancelButton
      └─ SaveButton

OrganizerSummaryDialog
  ├─ DialogHeader
  ├─ TemplateCountBadge
  ├─ SourceInfoCard
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

### 3.2 Improve Menu のサブメニュー化

**変更内容**: Improve Menu を単一ボタンからドロップダウンメニューに変更

**責務**:

- **Prompt Improver**: 既存のプロンプト改善機能（PromptImproveDialog）
- **Organize Prompts**: 新規のプロンプト整理実行機能（OrganizerExecuteDialog）

### 3.3 PinnedMenu のセクション分割

`PromptList.tsx` を拡張し、`menuType === "pinned"` の場合に以下の2セクションに分割:

- **Section A: あなたのピン留め** - ユーザーが手動でピン留めしたプロンプト (`!isAIGenerated`)
- **Section B: AIのおすすめテンプレ** - AI生成テンプレートで `showInPinned === true` のもの

### 3.4 新規未確認の装飾

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

**実装ファイル**: `src/services/promptOrganizer/PromptOrganizerService.ts`

**責務**: プロンプト整理の実行オーケストレーション

**主要メソッド**:

- `executeOrganization(settings)`: 各サービスを呼び出して整理を実行
- `estimateExecution(settings)`: 実行前のコスト見積もり（CostEstimatorService に委譲）
- `saveTemplates(candidates)`: テンプレート保存（TemplateSaveService に委譲）

**実行フロー** (`executeOrganization`):

1. PromptFilterService でプロンプト抽出
2. TemplateGeneratorService でテンプレート生成
3. CostEstimatorService でコスト計算
4. 結果オブジェクトを返す

**依存サービス**:

- PromptFilterService
- TemplateGeneratorService
- CostEstimatorService
- TemplateSaveService

### 4.1.1 PromptFilterService

**実装ファイル**: `src/services/promptOrganizer/PromptFilterService.ts`

**責務**: プロンプトのフィルタリングロジック

**主要メソッド**:

- `filterPrompts(prompts, settings)`: 絞り込み条件に基づいてプロンプトを抽出

**フィルタリング条件**:

1. 期間フィルター: 指定日数以内に実行されたプロンプトのみ
2. 実行回数フィルター: 最小実行回数以上のプロンプトのみ
3. AI生成プロンプトを除外
4. 実行回数でソート（降順）
5. 最大件数制限

**出力**: `PromptForOrganization[]` 形式（id, name, content, executionCountのみ）

### 4.1.2 TemplateGeneratorService

**実装ファイル**: `src/services/promptOrganizer/TemplateGeneratorService.ts`

**責務**: Gemini API 呼び出しとテンプレート候補への変換

**主要メソッド**:

- `generateTemplates(prompts, settings)`: テンプレート生成のメインロジック

**処理フロー**:

1. GeminiClient の初期化（API キー読み込み）
2. プロンプトテキスト構築（organizationPrompt + カテゴリ + 対象プロンプト）
3. Gemini API 呼び出し（構造化出力、JSON schema使用）
4. レスポンスをTemplateCandidate形式に変換
5. トークン使用量の返却

**使用モデル**: gemini-2.5-flash

**参照**: 05_api_design.md（API呼び出しの詳細）

### 4.1.3 CostEstimatorService

**実装ファイル**: `src/services/promptOrganizer/CostEstimatorService.ts`

**責務**: トークン数とコスト計算

**主要メソッド**:

- `calculateCost(usage)`: トークン使用量からコストを計算（JPY）
- `estimateExecution(settings)`: 実行前のコスト見積もり

**料金設定** (Gemini 2.5 Flash, Standard per-request):

- 料金定義ファイル: `src/services/promptOrganizer/pricing.ts`
- Input: $0.30 per 1M tokens
- Output: $2.50 per 1M tokens (includes thinking tokens)
- USD->JPY: 150円（固定レート）
- 参照: https://ai.google.dev/gemini-api/docs/pricing?hl=ja#gemini-2.5-flash

**見積もり処理フロー**:

1. 全プロンプトを取得
2. 対象プロンプトをフィルタリング
3. プロンプトテキストを構築（organizationPrompt + カテゴリ + 対象プロンプト）
4. トークン数を見積もり（GeminiClient.estimateTokens）
5. コストを計算（出力トークンは0で見積もり）

**コンテキスト制限**: 1,000,000 tokens (gemini-2.5-flash)

### 4.1.4 TemplateSaveService

**実装ファイル**: `src/services/promptOrganizer/TemplateSaveService.ts`

**責務**: テンプレート候補の永続化

**主要メソッド**:

- `saveTemplates(candidates)`: 選択されたテンプレートを保存

**保存処理フロー**:

1. `userAction` が `"save"` または `"save_and_pin"` のテンプレートをフィルタ
2. 各テンプレートについて：
   - TemplateConverter で TemplateCandidate を Prompt に変換
   - PromptsService で Prompt として保存
   - `"save_and_pin"` の場合は PinsService でピン留め

**依存サービス**:

- TemplateConverter: テンプレート変換
- PromptsService: プロンプト保存
- PinsService: ピン留め管理

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

**実装ファイル**: `src/services/promptOrganizer/CategoryService.ts`

**主要メソッド**:

- `getAll()`: すべてのカテゴリを取得
- `getById(id)`: IDからカテゴリを取得
- `create(name, description?)`: 新しいカテゴリを作成
- `update(id, updates)`: カテゴリを更新
- `delete(id)`: カテゴリを削除
- `rename(id, newName)`: カテゴリ名を変更
- `canDelete(id)`: 削除可能かチェック
- `getPromptCount(id)`: カテゴリを参照しているプロンプト数を取得

**カテゴリ削除時の処理**:

- デフォルトカテゴリは削除不可（isDefault=trueの場合はエラー）
- 削除されたカテゴリを参照しているプロンプトのcategoryIdをnullに設定

**注意**: デフォルトカテゴリはストレージの`fallback`で自動初期化されます（`src/services/promptOrganizer/defaultCategories.ts`で定義）。

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
│ │ 🎯 マーケティング  (2件)   [✏️] [🗑️]│     │
│ │ 🔬 リサーチ        (1件)   [✏️] [🗑️]│     │
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

**実装ファイル**: `src/services/promptOrganizer/TemplateConverter.ts`

**責務**: テンプレート変換（Gemini APIレスポンス → 内部データ構造）

**主要メソッド**:

- `convertToCandidate(generated, periodDays)`: GeneratedTemplate → TemplateCandidate
- `convertToPrompt(candidate)`: TemplateCandidate → Prompt（保存時）

**変数変換ロジック**:

- `convertToVariableConfig()`: ExtractedVariable → VariableConfig
- `inferVariableType()`: 変数名・説明から型を推論（text / textarea）

**変数型推論ルール**:

- 日付系（date, day含む）→ `text`
- 複数行（detail, content, description, 詳細, 内容, 説明）→ `text`
- その他 → `text`

**showInPinned 判定基準**:

- sourceCount >= 3（頻繁に使用）
- variables.length >= 2（汎用性が高い）

**変換時の処理**:

- `convertToCandidate`: 元の ExtractedVariable データを aiMetadata に保持
- `convertToPrompt`: confirmed を true に設定、VariableConfig[] をそのまま使用

**変数変換の詳細は `03_data_model.md` セクション1.4を参照。**

---

## 5. 状態管理

### 5.1 Custom Hook: usePromptOrganizer

**実装ファイル**: `src/hooks/usePromptOrganizer.ts`

**責務**: プロンプト整理機能の状態管理とUIロジック

**状態管理**:

- `settings`: 整理設定（PromptOrganizerSettings）
- `estimate`: 実行前の見積もり（OrganizerExecutionEstimate）
- `result`: 整理実行結果（PromptOrganizerResult）
- `isExecuting`: 実行中フラグ
- `error`: エラー情報（OrganizerError）

**主要メソッド**:

- `executeOrganization()`: 整理を実行してresultをセット
- `saveTemplates(candidates)`: 選択されたテンプレートを保存

**エフェクト**:

- マウント時に設定を読み込み（promptOrganizerSettingsStorage）
- 設定変更時に見積もりを自動再計算（estimateExecution）

**依存サービス**:

- promptOrganizerService
- promptOrganizerSettingsStorage

---

## 6. イベントフロー

### 6.1 実行フロー（Improve Menu経由）

```
[Improve Menu → "Organize Prompts" クリック]
  ↓
[OrganizerExecuteDialog 表示]
  ├─ 現在の設定を読み込み (promptOrganizerSettingsStorage)
  ├─ 対象プロンプト数を計算
  └─ コスト見積もりを表示
  ↓
[整理するボタン押下]
  ↓
executeOrganization()
  ├─ isExecuting = true
  ├─ promptOrganizerService.executeOrganization()
  │   ├─ プロンプト抽出 (PromptFilterService)
  │   ├─ Gemini API 呼び出し (TemplateGeneratorService)
  │   └─ テンプレート候補生成 (TemplateConverter)
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

### 6.2 設定変更フロー（Settings Menu経由）

```
[Settings Menu → "Prompt Organizer Settings" クリック]
  ↓
[OrganizerSettingsDialog 表示]
  ├─ 現在の設定を読み込み (promptOrganizerSettingsStorage)
  └─ フォームに設定値を表示
  ↓
[ユーザーが設定を変更]
  ├─ 絞り込み条件 (期間, 実行回数, 最大件数)
  └─ 整理用プロンプト
  ↓
[保存ボタン押下]
  ├─ バリデーション実行
  ├─ promptOrganizerSettingsStorage に保存
  └─ ダイアログを閉じる
  ↓
[設定保存完了]
```

### 6.3 Pinned リスト表示フロー

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

`06_test_design.md` を参照

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
