# プロンプト改善機能 設計書

## 概要

ユーザーが入力したプロンプトをGemini APIを使用して改善する機能を実装する。
AIが入力プロンプトを分析し、より効果的で明確なプロンプトに改善する。
改善結果はストリーミングでリアルタイムに表示され、ユーザーは改善版を適用するか選択できる。

### 主要機能

1. **プロンプト改善**: Gemini API (gemini-2.5-flash) による自動改善
2. **ストリーミング表示**: リアルタイムでの改善結果表示
3. **ユーザー設定管理**: APIキーとシステムプロンプトのユーザー設定
4. **柔軟なプロンプト管理**: テキスト入力またはURL指定による設定
5. **手動キャッシュ更新**: 設定画面からのキャッシュリフレッシュ

## 機能要件

### 1. プロンプト改善ボタン

- PromptImproveDialog のプロンプト入力欄（Textarea）上部に配置
- "Improve with AI" ボタンとして実装
- Sparkles アイコン（lucide-react）を使用
- クリックで Gemini API を呼び出し、プロンプトを改善

### 2. ストリーミング表示

- Gemini API の `generateContentStream` メソッドを使用
- 改善されたプロンプトを逐次的にプレビューエリアに表示
- リアルタイムでテキストが追加されていく体験を提供

### 3. プレビューエリア

- Textarea の下部に展開可能なエリアとして配置
- 読み取り専用の表示エリア
- スクロール可能
- 改善中は逐次更新、完了後は全文表示

### 4. 入力ボタン統合

- "Input" ボタンでAIサービスの入力欄へ下記の通り反映
  - **改善前**: 通常のプロンプト内容を入力
  - **改善後**: 改善されたプロンプトを自動的に使用

### 5. キャンセル機能

- 改善中 (isImproving === true) のみキャンセルボタンを表示
- クリックでストリーミング処理を中断

### 6. ユーザー設定機能 ★新規

#### 6-1. Gemini APIキーの設定

- **入力方法**: 設定ダイアログのテキスト入力欄
- **保存場所**: ブラウザローカルストレージ（プレーンテキスト）
- **初期状態**: 未設定（環境変数からも取得しない）
- **開発モード**: 環境変数をフォールバックとして使用可能
- **本番モード**: ユーザー設定のみ

**APIキー取得ガイド**:

- Google AI Studio へのリンク: https://ai.google.dev/gemini-api/docs/api-key
- キー作成手順の簡易説明

**利用規約の注意喚起**:

- 無料APIキーは学習に使用される可能性がある
- プライバシーに配慮した利用を促す
- 参考リンク: https://ai.google.dev/gemini-api/terms?hl=ja

#### 6-2. システムプロンプトの設定

**入力方法の選択** (ラジオボタン):

- **方法A: テキスト直接入力**
  - 多行テキストエリアで直接システムプロンプトを入力
  - リアルタイムで保存
  - プレビュー機能あり

- **方法B: URL指定**
  - GitHub Gist 等のURLを指定
  - 取得ボタンでプロンプトを取得
  - キャッシュ機構（1日TTL）を使用
  - 取得失敗時のエラー表示

**視覚的な有効/無効の表示**:

- 選択中の方法: アクティブ表示（通常の色）
- 非選択の方法: グレーアウト + 無効メッセージ
- 最終更新日時の表示

**優先順位** (全ユーザー共通):

1. ユーザーテキスト設定（方法A）
2. ユーザーURL設定（方法B、キャッシュ経由）
3. 環境変数URL (WXT_IMPROVE_PROMPT_URL)
4. デフォルトシステムプロンプト

#### 6-3. 設定ダイアログ

**起動方法**:

- 設定メニュー > "Prompt Improver Settings"
- PromptImproveDialog の警告バナーからも起動可能

**構成**:

設定ダイアログの詳細な画面構成については、後述の「UI/UXフロー > 設定ダイアログ画面」セクションを参照。

**主要要素**:

- **API Key Settings**:
  - APIキー入力フィールド（Show/Hide切り替え）
  - APIキー取得ガイドリンク
  - プライバシーに関する注意喚起

- **System Prompt Settings**:
  - 入力方法選択（ラジオボタン: Direct Text Input / URL）
  - 条件表示エリア（選択に応じて切り替え）
  - プレビューエリア（読み取り専用）
  - 最終更新日時表示

### 7. APIキー未設定時の警告

**PromptImproveDialog での表示**:

- ダイアログ上部に警告バナー表示
- "Gemini API key is not configured"
- "Open Settings" ボタンで設定画面へ誘導
- 改善ボタンは無効化

### 8. エラーハンドリング

- API エラー時: エラーメッセージ表示
- ネットワークエラー: 再試行の提案
- タイムアウト: 30秒で自動キャンセル
- 空プロンプトのバリデーション
- URL取得失敗時のフォールバック
- APIキー未設定時の警告

## 技術仕様

### アーキテクチャ

```
PromptImproveDialog (UI)
↓ (APIキー未設定時警告)
↓
PromptImprover (Service) ← loadSettings()
↓                        ↓
GeminiClient             PromptImproverSettingsService
↓                        ↓
@google/genai            WXT Storage API
                         ├─ genaiApiKeyStorage
                         ├─ improvePromptSettingsStorage
                         └─ improvePromptCacheStorage

SettingsMenu → PromptImproverSettingsDialog
                ↓
                PromptImproverSettingsService
```

**レイヤー構成**:

- **UI Layer**: PromptImproveDialog, PromptImproverSettingsDialog - ユーザーインタラクション
- **Service Layer**: PromptImprover, GeminiClient - ビジネスロジック
- **Storage Layer**: PromptImproverSettingsService - 設定管理
- **Cache Layer**: ImprovePromptCacheService - URL取得時のキャッシュ管理

### データモデル

#### 型定義

```typescript
/**
 * プロンプト改善のオプション
 */
export interface ImproveOptions {
  /** 改善対象のプロンプト */
  prompt: string
  /** ストリーミングコールバック */
  onStream?: (chunk: string) => void
  /** 完了コールバック */
  onComplete?: (improvedPrompt: string) => void
  /** エラーコールバック */
  onError?: (error: Error) => void
}

/**
 * Gemini API レスポンスチャンク
 */
export interface StreamChunk {
  /** チャンクのテキスト */
  text: string
}

/**
 * Gemini API設定
 */
export interface GeminiConfig {
  /** APIキー */
  apiKey: string
  /** モデル名 */
  model: string
  /** システムインストラクション */
  systemInstruction?: string
  /** 温度パラメータ */
  temperature?: number
  /** 最大出力トークン数 */
  maxOutputTokens?: number
}

/**
 * 改善プロンプト設定 ★新規
 */
export interface ImprovePromptSettings {
  /** 入力方法: 'text' または 'url' */
  mode: "text" | "url"
  /** テキスト直接入力の内容 */
  textContent: string
  /** URL指定の場合のURL */
  urlContent: string
  /** 最終更新タイムスタンプ */
  lastModified: number
}

/**
 * 改善プロンプトキャッシュデータ
 */
export interface ImprovePromptCacheData {
  /** キャッシュ日付 (YYYY-MM-DD) */
  date: string
  /** システムインストラクション */
  instruction: string
  /** キャッシュ作成タイムスタンプ */
  cachedAt: number
}
```

### コンポーネント構成

#### 1. GeminiClient

**ファイル**: `src/services/genai/GeminiClient.ts`

**役割**: Gemini API のシングルトンラッパー

**機能**:

- GoogleGenAI クライアントの初期化
- API キーの管理（ストレージから取得）
- generateContentStream の実装
- エラーハンドリング

**インターフェース**:

```typescript
class GeminiClient {
  private static instance: GeminiClient | null = null

  static getInstance(): GeminiClient
  initialize(apiKey: string): void

  async *generateContentStream(
    prompt: string,
    config?: Partial<GeminiConfig>,
  ): AsyncGenerator<StreamChunk, void, unknown>
}
```

#### 2. PromptImprover

**ファイル**: `src/services/genai/PromptImprover.ts`

**役割**: プロンプト改善のビジネスロジック

**機能**:

- ユーザー設定からAPIキー読み込み ★変更
- システムプロンプトの優先順位管理 ★変更
- ストリーミングコールバックの制御
- エラーハンドリング
- タイムアウト処理（30秒）
- キャンセル機能

**システムプロンプトの優先順位** ★変更 (全ユーザー共通):

1. **ユーザーテキスト設定**: `improvePromptSettings.mode === 'text'`
2. **ユーザーURL設定**: `improvePromptSettings.mode === 'url'` → キャッシュ → fetch
3. **環境変数URL**: `WXT_IMPROVE_PROMPT_URL` → キャッシュ → fetch
4. **デフォルト値**: ハードコードされたデフォルト

**APIキーの取得** ★変更:

**本番モード**:

- `genaiApiKeyStorage` から取得
- 未設定の場合: エラー

**開発モード**:

1. `genaiApiKeyStorage` から取得
2. 未設定の場合: `WXT_GENAI_API_KEY` から取得
3. それでも未設定: エラー

**デフォルトシステムプロンプト**:

```
You are an excellent Prompt Engineer. Analyze the user's input prompt and improve it to be more effective.

Improvement Guidelines:
- Maintain the intent and purpose of the prompt
- Apply the following improvements as needed:
  * Clarify ambiguous expressions for better clarity
  * Structure with bullet points or sections
  * Add necessary background information or constraints
- Avoid being overly verbose
- Determine the optimal improvement approach based on the prompt's characteristics (simple/complex, technical/general, etc.)

Output only the improved prompt. No explanations or preambles are necessary.
```

**インターフェース**:

```typescript
class PromptImprover {
  private systemInstruction: string
  private apiKey: string

  async loadSettings(): Promise<void> // ★新規
  async improvePrompt(options: ImproveOptions): Promise<void>
  cancel(): void
  getSystemInstruction(): string
  isApiKeyConfigured(): boolean // ★新規
}
```

#### 3. ImprovePromptCacheService

**ファイル**: `src/services/storage/improvePromptCache.ts`

**役割**: URL指定時のシステムプロンプトキャッシュ管理

**機能**:

- 日付ベースのキャッシュ管理（1日TTL）
- キャッシュの保存・取得・削除
- キャッシュメタデータの提供

**インターフェース**:

```typescript
class ImprovePromptCacheService {
  async getTodaysCache(): Promise<string | null>
  async saveCache(instruction: string): Promise<void>
  async getLatestCache(): Promise<string | null>
  async clearCache(): Promise<void>
  async getCacheMetadata(): Promise<{ date: string; cachedAt: number } | null>
  isToday(dateStr: string): boolean
  getCurrentDateString(): string
}
```

**キャッシュ戦略**:

- キャッシュキー: `local:improvePromptCache`
- TTL: 1日（日付文字列YYYY-MM-DDで判定）
- 保存場所: WXT Storage API (local storage)
- 対象: URL指定の場合のみ（テキスト直接入力はキャッシュ不要）

#### 4. PromptImproverSettingsDialog ★新規

**ファイル**: `src/components/settings/PromptImproverSettingsDialog.tsx`

**役割**: Prompt Improver の設定ダイアログ

**機能**:

- APIキーの入力・保存
- システムプロンプトの入力方法選択（ラジオボタン）
- テキスト直接入力 UI
- URL指定 UI
- プレビュー表示
- バリデーション
- 利用規約の注意喚起
- APIキー取得ガイドリンク

**状態管理**:

```typescript
const [apiKey, setApiKey] = useState<string>("")
const [showApiKey, setShowApiKey] = useState(false)
const [settings, setSettings] = useState<ImprovePromptSettings>({
  mode: "url",
  textContent: "",
  urlContent: "",
  lastModified: 0,
})
const [previewPrompt, setPreviewPrompt] = useState<string>("")
const [isFetching, setIsFetching] = useState(false)
const [fetchError, setFetchError] = useState<string | null>(null)
```

**UI構成**:

- APIキー設定セクション
  - テキスト入力（type="password"、Show/Hideボタン）
  - 取得ガイドリンク
  - 注意喚起メッセージ
- システムプロンプト設定セクション
  - ラジオボタン（Text / URL）
  - 条件表示エリア
    - Text選択時: Textarea
    - URL選択時: URL入力 + Fetchボタン
  - プレビューエリア（読み取り専用）
  - 最終更新日時表示

#### 5. PromptImproveDialog ★拡張

**ファイル**: `src/components/inputMenu/controller/PromptImproveDialog.tsx`

**追加機能**:

- APIキー未設定時の警告バナー表示
  - 警告メッセージと設定画面への誘導ボタンを含む
  - 警告スタイルで目立つように表示
- 設定画面への誘導ボタン
- 改善ボタンの無効化（APIキー未設定時）

#### 6. SettingsMenu ★拡張

**ファイル**: `src/components/inputMenu/SettingsMenu.tsx`

**追加機能**:

- "Prompt Improver Settings" メニュー項目追加
- PromptImproverSettingsDialog の呼び出し

**UI配置**:

```
Settings Menu
├── Features ON/OFF
├── Autocomplete target
├── Import/Export
├── Cache Management
└── Prompt Improver Settings  ← ★新規追加
```

### 実装ファイル

#### 新規作成

1. **`src/components/settings/PromptImproverSettingsDialog.tsx`**
   - 設定ダイアログコンポーネント
   - APIキー入力UI
   - システムプロンプト設定UI

2. **`src/components/settings/__tests__/PromptImproverSettingsDialog.test.tsx`**
   - 設定ダイアログのユニットテスト

#### 修正対象

1. **`src/services/storage/definitions.ts`**
   - `genaiApiKeyStorage` の定義追加
   - `improvePromptSettingsStorage` の定義追加

2. **`src/services/genai/PromptImprover.ts`**
   - `loadSettings()` メソッド追加
   - `isApiKeyConfigured()` メソッド追加
   - APIキー取得ロジック変更（環境変数 → ストレージ優先）
   - システムプロンプト優先順位ロジック変更

3. **`src/components/inputMenu/controller/PromptImproveDialog.tsx`**
   - APIキー未設定警告バナー追加
   - 設定画面への誘導ボタン追加
   - 改善ボタンの無効化ロジック追加

4. **`src/components/inputMenu/SettingsMenu.tsx`**
   - "Prompt Improver Settings" メニュー項目追加
   - PromptImproverSettingsDialog の統合

5. **`src/locales/en.yml`**
   - 設定ダイアログの英語翻訳追加
   - 警告メッセージの英語翻訳追加

6. **`src/locales/ja.yml`**
   - 設定ダイアログの日本語翻訳追加
   - 警告メッセージの日本語翻訳追加

7. **`docs/prompt-improver-design.md`**
   - 設計ドキュメント全面更新（本ファイル）

## UI/UXフロー

### プロンプト改善画面

```
+--------------------------------------------------+
| プロンプトの改善                                 |
+--------------------------------------------------+
| [APIキー未設定の警告バナー]            [設定]    | ← ★追加
+--------------------------------------------------+
| プロンプト:                                      |
| +----------------------------------------------+ |
| | ユーザーが入力したプロンプト...              | |
| |                                              | |
| +----------------------------------------------+ |
|                                                  |
| --- 改善されたプロンプト ---                     |
| +----------------------------------------------+ |
| | [✨ Improve with AI]  (APIキー設定時のみ)    | |
| |                                              | |
| | より効果的なプロンプトに改善された内容が     | |
| | ストリーミングで逐次表示される...            | |
| | (読み取り専用、スクロール可能)               | |
| |                                              | |
| +----------------------------------------------+ |
|                                                  |
| [キャンセル]                           [入力]    |
+--------------------------------------------------+
```

### 設定ダイアログ画面 ★新規

```
+---------------------------------------------------------+
| Prompt Improver Settings                          [×]   |
+---------------------------------------------------------+
|                                                         |
| API Key Settings                                        |
| ┌──────────────────────────────────────────────────────┐|
| │ Gemini API Key:                                      ││
| │ [●●●●●●●●●●●●●●●●●●●●]  [👁️ Show]                    ││
| │                                                      ││
| │ ℹ️  Get your free API key:                           ││
| │    https://ai.google.dev/gemini-api/docs/api-key     ││
| │                                                      ││
| │ ⚠️  Important: Free API keys may be used for model   ││
| │    training. Please review the terms of service:     ││
| │    https://ai.google.dev/gemini-api/terms?hl=ja      ││
| └──────────────────────────────────────────────────────┘|
|                                                         |
| System Prompt Settings                                  |
| ┌──────────────────────────────────────────────────────┐|
| │ Prompt Source:                                       ││
| │ ◯ Direct Text Input                                  ││
| │ ● URL (GitHub Gist, etc.)                            ││
| │                                                      ││
| │ ┌──────────────────────────────────────────────────┐ ││
| │ │ URL:                                             │ ││
| │ │ [https://gist.github.com/...                 ]   │ ││
| │ │                                 [Fetch Prompt]   │ ││
| │ │ Last fetched: 2024-01-15 12:34                   │ ││
| │ └──────────────────────────────────────────────────┘ ││
| │                                                      ││
| │ Preview:                                             ││
| │ ┌──────────────────────────────────────────────────┐ ││
| │ │ You are an excellent Prompt Engineer...          │ ││
| │ │ Analyze the user's input prompt...               │ ││
| │ │ (Read-only preview, 6 lines)                     │ ││
| │ └──────────────────────────────────────────────────┘ ││
| └──────────────────────────────────────────────────────┘|
|                                                         |
| [Cancel]                                     [Save]     |
+---------------------------------------------------------+
```

### 状態遷移

#### プロンプト改善フロー

```
初期状態
↓
APIキーチェック
├─ 設定済み → 改善ボタン有効
└─ 未設定 → 警告バナー表示 + 改善ボタン無効
           ↓
           [設定]ボタンクリック
           ↓
           設定ダイアログ表示
           ↓
           APIキー入力 + 保存
           ↓
           ダイアログ閉じる
           ↓
           改善ボタン有効化
↓
[Improve with AI] ボタンクリック
↓
ローディング状態 (isImproving = true)
↓
ストリーミング開始
↓ (逐次更新)
プレビューエリアにテキスト追加
↓
ストリーミング完了
↓
[Input] ボタンで改善版を適用
↓
AIサービスに入力
```

#### 設定保存フロー ★新規

```
設定メニュー > "Prompt Improver Settings" クリック
↓
PromptImproverSettingsDialog 表示
↓
[APIキー設定]
├─ APIキー入力
└─ 表示/非表示切り替え
↓
[システムプロンプト設定]
├─ ラジオボタンで選択
│  ├─ "Direct Text Input" 選択
│  │  ↓
│  │  Textarea表示 → テキスト入力
│  │
│  └─ "URL" 選択
│     ↓
│     URL入力欄表示 → URL入力 → [Fetch Prompt]
│     ↓
│     取得成功 → プレビュー更新
│     取得失敗 → エラー表示
│
└─ プレビュー確認
↓
[Save] ボタンクリック
↓
バリデーション
├─ APIキー: 空でないこと
├─ URL: 有効なURL形式（URL選択時）
└─ テキスト: 空でないこと（テキスト選択時）
↓
ストレージに保存
├─ genaiApiKeyStorage.setValue(apiKey)
└─ improvePromptSettingsStorage.setValue(settings)
↓
ダイアログ閉じる
```

## データフロー

### プロンプト改善フロー

```
ユーザーがプロンプトを入力
↓
[Improve with AI] ボタンクリック
↓
PromptImproveDialog.handleImprove()
↓
PromptImprover.improvePrompt({
  prompt: content,
  onStream: (chunk) => setImprovedContent(prev => prev + chunk),
  onComplete: () => setIsImproving(false),
  onError: (error) => setImprovementError(error.message)
})
↓
PromptImprover.loadSettings()  // ★APIキーと システムプロンプト読み込み
↓
GeminiClient.generateContentStream(prompt, {
  systemInstruction: this.systemInstruction
})
↓
Gemini API (gemini-2.5-flash)
↓ (ストリーミング)
for await (const chunk of responseStream)
↓
onStream コールバック実行
↓
UI にテキスト追加表示
↓
完了 or エラー
```

### システムプロンプトロードフロー ★変更 (全ユーザー共通)

```
PromptImprover.loadSettings()
↓
1. improvePromptSettingsStorage から設定読み込み
   ├─ mode === 'text' && textContent が空でない
   │  ↓
   │  settings.textContent を使用 → 終了
   │
   ├─ mode === 'url' && urlContent が空でない
   │  ↓
   │  2. getTodaysCache() を確認
   │     ├─ ヒット → キャッシュ使用 → 終了
   │     └─ ミス → 3へ
   │  ↓
   │  3. settings.urlContent から fetch
   │     ├─ 成功 → saveCache() → 使用 → 終了
   │     └─ 失敗 → 4へ
   │
   └─ ユーザー設定なし → 環境変数へフォールバック
      ↓
      4. WXT_IMPROVE_PROMPT_URL が設定されているか確認
         ├─ あり → 5へ
         └─ なし → 8へ
      ↓
      5. getTodaysCache() を確認
         ├─ ヒット → キャッシュ使用 → 終了
         └─ ミス → 6へ
      ↓
      6. 環境変数URLから fetch
         ├─ 成功 → saveCache() → 使用 → 終了
         └─ 失敗 → 7へ
      ↓
      7. getLatestCache() を確認
         ├─ ヒット → 古いキャッシュ使用 → 終了
         └─ ミス → 8へ
      ↓
      8. DEFAULT_INSTRUCTION を使用
```

### APIキー取得フロー ★新規

**本番モード**:

```
PromptImprover.loadSettings()
↓
genaiApiKeyStorage.getValue()
├─ 値あり → 使用
└─ 値なし → エラー (APIキー未設定)
```

**開発モード**:

```
PromptImprover.loadSettings()
↓
genaiApiKeyStorage.getValue()
├─ 値あり → 使用
└─ 値なし → 環境変数へフォールバック
   ↓
   import.meta.env.WXT_GENAI_API_KEY
   ├─ 値あり → 使用
   └─ 値なし → エラー (APIキー未設定)
```

### 設定保存フロー ★新規

```
PromptImproverSettingsDialog で [Save] クリック
↓
バリデーション
↓
genaiApiKeyStorage.setValue(apiKey)
↓
improvePromptSettingsStorage.setValue({
  mode: selectedMode,
  textContent: textContent,
  urlContent: urlContent,
  lastModified: Date.now()
})
↓
成功メッセージ表示
↓
ダイアログ閉じる
```

### URL取得フロー ★新規

```
PromptImproverSettingsDialog で [Fetch Prompt] クリック
↓
setIsFetching(true)
↓
fetch(urlContent)
├─ 成功
│  ↓
│  レスポンステキスト取得
│  ↓
│  setPreviewPrompt(text)
│  ↓
│  setIsFetching(false)
│
└─ 失敗
   ↓
   setFetchError(error.message)
   ↓
   setIsFetching(false)
```

## 環境変数とストレージ

### 環境変数 ★変更

**開発環境** (.env.development):

```bash
# APIキー: 開発時のフォールバック（ユーザー設定優先）
WXT_GENAI_API_KEY=<開発用 API Key>

# システムプロンプトURL: 全ユーザーのデフォルトフォールバック
WXT_IMPROVE_PROMPT_URL=https://gist.githubusercontent.com/ujiro99/.../improve-prompt-default.md

WXT_E2E=false
```

**本番環境** (.env):

```bash
# APIキー: 本番では環境変数を使用しない（ユーザー設定のみ）

# システムプロンプトURL: 全ユーザーのデフォルトフォールバック
WXT_IMPROVE_PROMPT_URL=https://gist.githubusercontent.com/ujiro99/.../improve-prompt-default.md

WXT_E2E=true
```

### ストレージ定義 ★拡張

**genaiApiKeyStorage** ★新規:

```typescript
export const genaiApiKeyStorage = storage.defineItem<string>(
  "local:genaiApiKey",
  {
    fallback: "",
    version: 1,
    migrations: {},
  },
)
```

**improvePromptSettingsStorage** ★新規:

```typescript
export const improvePromptSettingsStorage =
  storage.defineItem<ImprovePromptSettings>("local:improvePromptSettings", {
    fallback: {
      mode: "url",
      textContent: "",
      urlContent: "",
      lastModified: 0,
    },
    version: 1,
    migrations: {},
  })
```

**improvePromptCacheStorage** (既存):

```typescript
export const improvePromptCacheStorage =
  storage.defineItem<ImprovePromptCacheData | null>(
    "local:improvePromptCache",
    {
      fallback: null,
      version: 1,
      migrations: {},
    },
  )
```

### データ構造

**genaiApiKeyStorage**:

```typescript
string // APIキー文字列（プレーンテキスト）
```

**improvePromptSettingsStorage**:

```typescript
{
  mode: "text",                       // または "url"
  textContent: "You are...",          // テキスト直接入力の場合
  urlContent: "https://gist...",      // URL指定の場合
  lastModified: 1705320000000         // Unix timestamp
}
```

**improvePromptCacheStorage**:

```typescript
{
  date: "2024-01-15",                 // YYYY-MM-DD
  instruction: "System prompt...",
  cachedAt: 1705320000000             // Unix timestamp
}
```

## エラーハンドリング

### エラーケース

1. **API キー未設定** ★拡張
   - **検出**: PromptImprover.loadSettings() または PromptImproveDialog 初期化時
   - **表示**: PromptImproveDialog 上部に警告バナー
   - **メッセージ**: "Gemini API key is not configured. Please set your API key in settings."
   - **対応**: "Open Settings" ボタンで設定画面へ誘導
   - **制約**: 改善ボタンを無効化

2. **API キー無効**
   - **検出**: Gemini API 呼び出し時
   - **エラーメッセージ**: "Invalid API key. Please check your API key in settings."
   - **対応**: 設定画面への誘導

3. **ネットワークエラー**
   - **エラーメッセージ**: "Network error. Please check your connection."
   - **対応**: リトライボタン表示

4. **API エラー**
   - **エラーメッセージ**: API からのエラーメッセージを表示
   - **対応**: エラーログを記録

5. **タイムアウト**
   - 30秒でタイムアウト
   - **エラーメッセージ**: "Request timed out. Please try again."

6. **空プロンプト**
   - **バリデーション**: 改善ボタンを無効化
   - **エラーメッセージ**: なし

7. **URL取得失敗** ★新規
   - **検出**: 設定ダイアログでのURL取得時
   - **エラーメッセージ**: "Failed to fetch prompt from URL: {error}"
   - **対応**:
     - エラー表示
     - 古いキャッシュへのフォールバック（使用時）
     - URL再入力を促す

8. **バリデーションエラー** ★新規
   - **APIキー**: 空でないこと
   - **URL**: 有効なURL形式（URL選択時）
   - **テキスト**: 空でないこと（テキスト選択時）
   - **表示**: 該当フィールド下に赤字でエラーメッセージ

### エラー表示例

**PromptImproveDialog 警告バナー**:

- 警告スタイルのバナー（黄色系の背景と枠線）
- AlertCircle アイコン表示
- エラーメッセージ: "Gemini API key is not configured"
- "Open Settings" ボタンで設定画面へ誘導

**設定ダイアログ URL取得エラー**:

- エラースタイルの表示（赤系の背景と枠線）
- エラーメッセージを表示

## パフォーマンス

### 最適化

1. **デバウンス**: ストリーミング中のUI更新を最小限に抑える
2. **メモ化**: コールバック関数のメモ化
3. **クリーンアップ**: コンポーネントアンマウント時の処理中断
4. **キャッシュ活用**: URL取得時の1日TTLキャッシュ
5. **条件付きロード**: 設定ダイアログは開いた時のみロード

### リソース管理

- API コールのキャンセル機能
- メモリリーク防止
- イベントリスナーのクリーンアップ
- ストレージ読み込みの最適化（必要時のみ）

## セキュリティ

### API キー保護 ★拡張

**現行の実装**:

- ブラウザローカルストレージにプレーンテキストで保存
- ブラウザのデベロッパーツールで閲覧可能
- 拡張機能のコンテキスト内でのみアクセス可能

**セキュリティ対策**:

1. **スコープ制限**: ローカルストレージは拡張機能のみアクセス可能
2. **HTTPS通信**: Gemini API へはHTTPSで通信
3. **ユーザー教育**:
   - APIキーの取り扱い注意を表示
   - 無料キーの学習利用について注意喚起
   - 利用規約へのリンク提供

**将来の改善検討**:

- Web Crypto API を使用した暗号化保存
- セッションベースのキー管理
- キーローテーション機能

### XSS 対策

- プレビュー表示時のサニタイゼーション
- React の自動エスケープを利用
- URL入力時のバリデーション

### プライバシー保護 ★新規

1. **データの保存場所**:
   - APIキー: ローカルストレージのみ
   - システムプロンプト: ローカルストレージのみ
   - ユーザープロンプト: Gemini API のみに送信（ログ保存なし）

2. **利用規約の明示**:
   - 無料APIキーは学習に使用される可能性
   - プライバシーに配慮した利用を推奨
   - Google AI の利用規約へのリンク

3. **データの削除**:
   - ブラウザストレージクリアで完全削除
   - 拡張機能アンインストール時に自動削除

## テスト設計

### ユニットテスト

#### 1. GeminiClient.test.ts (15 tests)

- `getInstance()`: シングルトンインスタンスの取得
- `initialize()`: API キーの設定
- `generateContentStream()`: ストリーミングレスポンスの処理
- エラーハンドリング:
  - API キー未設定エラー
  - ネットワークエラー
  - 一般的なエラー
- ストリームの正常終了確認

#### 2. PromptImprover.test.ts ★拡張

- `loadSettings()`: 設定読み込み
  - ユーザー設定優先
  - 開発モード時の環境変数フォールバック
  - 本番モード時のユーザー設定のみ
- `isApiKeyConfigured()`: APIキー設定チェック
- `improvePrompt()`: 正常系フロー
- ストリーミングコールバック: onStream, onComplete, onError
- `cancel()`: 処理の中断
- タイムアウト処理
- `getSystemInstruction()`: システムプロンプトの取得
- 空プロンプトのバリデーション

**既知の問題**:

- 4 tests failing (window.setTimeout undefined in test environment)
- ブラウザ環境では正常動作

#### 3. improvePromptCache.test.ts (14 tests, ✓ All passing)

- `getTodaysCache()`: 今日のキャッシュ取得
  - 日付一致時の取得成功
  - 日付不一致時のnull返却
  - キャッシュ不在時のnull返却
- `saveCache()`: キャッシュ保存
  - 日付とタイムスタンプ付きで保存
- `getLatestCache()`: 最新キャッシュ取得
  - 日付に関係なく取得
- `clearCache()`: キャッシュクリア
- `getCacheMetadata()`: メタデータ取得
- `isToday()`: 日付判定
- `getCurrentDateString()`: 日付文字列生成

#### 4. PromptImproveDialog.test.tsx ★拡張

- 改善ボタンのレンダリング
- APIキー未設定時の警告バナー表示
- 設定画面への誘導ボタン
- 改善ボタンの無効化（APIキー未設定時）
- ボタンクリック時の動作
- プレビューエリアの表示/非表示
- ストリーミング中のローディング状態
- キャンセルボタンの条件表示
- "Input"ボタンとの統合動作
- エラー表示

#### 5. PromptImproverSettingsDialog.test.tsx ★新規

- ダイアログの表示/非表示
- APIキー入力と表示/非表示切り替え
- システムプロンプト入力方法の切り替え
  - ラジオボタンの動作
  - 条件表示エリアの切り替え
- テキスト入力モード
  - Textareaの表示
  - 入力内容の保存
- URL指定モード
  - URL入力欄の表示
  - Fetchボタンの動作
  - 取得成功時のプレビュー更新
  - 取得失敗時のエラー表示
- バリデーション
  - APIキーの必須チェック
  - URLフォーマットチェック
  - テキスト内容の必須チェック
- 保存処理
  - ストレージへの保存確認
  - 成功メッセージ表示

### E2Eテスト（将来的に）

- プロンプト入力 → 改善 → プレビュー → AI サービスへ送信
- APIキー未設定時の警告表示
- 設定画面でのAPIキー設定
- システムプロンプトのテキスト入力
- システムプロンプトのURL指定
- キャッシュロードの確認
- 設定画面からのキャッシュリフレッシュ
- エラーケースの確認

## 考慮事項

### 技術的負債

- レート制限への対応
- コスト監視機能（使用量トラッキング）
- `app.config.ts` の型エラー（既存、本機能とは無関係）

### UX 改善

- 改善履歴の保存
- 改善前後の比較表示
- カスタマイズ可能な改善スタイル（設定から選択）
- キャッシュステータスの可視化（最終更新日時など）

### 国際化

- システムプロンプトの多言語対応（現状は英語のみ）
- UI ラベルの翻訳（英語・日本語対応）
- 設定ダイアログの多言語対応

### セキュリティとプライバシー ★拡張

**現行のアプローチ**:

- APIキー: プレーンテキストでローカルストレージに保存
- 拡張機能のコンテキストでのみアクセス可能
- HTTPS通信のみ

**注意喚起**:

- 無料APIキーは学習に使用される可能性がある旨を明示
- Google AI の利用規約へのリンク提供
- プライバシーに配慮した利用を促す

## キャッシュ戦略の詳細

### キャッシュのTTL管理

- **日付ベース**: YYYY-MM-DD 形式で日付を保存
- **判定ロジック**: `getCurrentDateString()` との完全一致で判定
- **TTL**: 実質24時間（日付が変わるまで）
- **タイムゾーン**: ローカルタイムゾーン依存
- **適用対象**: URL指定の場合のみ（テキスト直接入力は対象外）

### フォールバック戦略の利点

1. **オフライン対応**: ネットワーク不通時も古いキャッシュで動作
2. **GitHub障害時の継続性**: Gist が利用不可でも影響最小限
3. **レイテンシ削減**: 毎回のネットワークリクエスト不要
4. **コスト削減**: API コール削減（Gemini APIは有料）

### キャッシュ更新トリガー

1. **自動更新**: 日付変更時（0:00以降の初回使用）
2. **手動更新**: 設定ダイアログの "Fetch Prompt" ボタン
3. **設定変更時**: URL変更後の初回使用

## 実装完了チェックリスト

### Phase 1: ストレージとデータモデル

- [x] GeminiClient 実装
- [x] PromptImprover 実装（既存）
- [x] ImprovePromptCacheService 実装
- [ ] ストレージ定義追加
  - [ ] genaiApiKeyStorage
  - [ ] improvePromptSettingsStorage

### Phase 2: 設定ダイアログ

- [ ] PromptImproverSettingsDialog 実装
  - [ ] APIキー入力UI
  - [ ] システムプロンプト設定UI
  - [ ] バリデーション
  - [ ] プレビュー表示

### Phase 3: 既存コンポーネント修正

- [ ] PromptImprover 修正
  - [ ] loadSettings() 実装
  - [ ] isApiKeyConfigured() 実装
  - [ ] 優先順位ロジック変更
- [ ] PromptImproveDialog 修正
  - [ ] 警告バナー追加
  - [ ] 設定画面への誘導
- [ ] SettingsMenu 修正
  - [ ] メニュー項目追加

### Phase 4: 国際化

- [ ] i18n 翻訳（英語・日本語）
  - [ ] 設定ダイアログ
  - [ ] 警告メッセージ
  - [ ] エラーメッセージ

### Phase 5: テストとドキュメント

- [ ] ユニットテスト
  - [x] GeminiClient.test.ts (15 tests)
  - [x] PromptImprover.test.ts (7 tests, 4 failing - 既知の問題)
  - [x] improvePromptCache.test.ts (14 tests, all passing)
  - [ ] PromptImproverSettingsDialog.test.tsx (新規)
  - [ ] PromptImproveDialog.test.tsx (警告バナーテスト追加)
- [ ] E2Eテスト（将来実装）
- [x] 設計ドキュメント更新

## 注意事項

### 必須要件

- Gemini API の使用には API キーが必要（ユーザーが設定）
- 初回起動時は必ず設定が必要
- ストリーミングレスポンスのため、ネットワーク接続が必須

### 制約事項

- API のレート制限やクォータに注意
- URL指定時は公開URLであること（プライベートGistは不可）
- キャッシュは日付ベースのため、頻繁な更新には未対応
- APIキーはプレーンテキスト保存

### 開発環境と本番環境の違い ★新規

**全環境共通**:

- `WXT_IMPROVE_PROMPT_URL`: 全ユーザーのデフォルトフォールバックとして使用

**開発環境** (WXT_E2E === 'false'):

- `WXT_GENAI_API_KEY`: 開発時のフォールバックとして使用可能（ユーザー設定優先）
- デバッグ用途でAPIキーの設定なしでも動作可能

**本番環境** (WXT_E2E === 'true'):

- `WXT_GENAI_API_KEY`: 環境変数は無視、ユーザー設定のみ有効
- 初回起動時は必ずAPIキーの設定が必要

### トラブルシューティング

**APIキーが認識されない**:

1. 設定画面でAPIキーが正しく入力されているか確認
2. ブラウザのデベロッパーツールでストレージを確認
3. `genaiApiKey` キーに値が保存されているか確認
4. APIキーの形式が正しいか確認（Google AI Studio で発行）

**システムプロンプトが更新されない**:

1. 設定ダイアログで入力方法を確認
2. URL指定の場合: "Fetch Prompt" ボタンで手動取得
3. テキスト入力の場合: 内容が保存されているか確認
4. ブラウザストレージの `improvePromptSettings` を確認

**改善が動作しない**:

1. APIキーが設定されているか確認
2. ネットワーク接続を確認
3. ブラウザコンソールでエラーメッセージを確認
4. Gemini API のステータスページを確認

**URL取得が失敗する**:

1. URLが正しいか確認（公開URLであること）
2. ネットワーク接続を確認
3. CORS エラーの場合: GitHub Gist 等の対応サービスを使用
4. 古いキャッシュが残っていれば自動的にフォールバック

**キャッシュが古い**:

1. 設定ダイアログで "Fetch Prompt" を実行
2. ブラウザストレージをクリアして再度設定
3. URL を再入力して保存
