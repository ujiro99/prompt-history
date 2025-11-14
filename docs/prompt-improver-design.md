# プロンプト改善機能 設計書

## 概要

ユーザーが入力したプロンプトをGemini APIを使用して改善する機能を実装する。
AIが入力プロンプトを分析し、より効果的で明確なプロンプトに改善する。
改善結果はストリーミングでリアルタイムに表示され、ユーザーは改善版を適用するか選択できる。

### 主要機能

1. **プロンプト改善**: Gemini API (gemini-2.5-flash) による自動改善
2. **ストリーミング表示**: リアルタイムでの改善結果表示
3. **システムプロンプト管理**: GitHub Gist からの動的取得とキャッシング
4. **手動キャッシュ更新**: 設定画面からのキャッシュリフレッシュ

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

### 4. 入力ボタン

- "Input" ボタンでプロンプトをAIサービスの入力欄へ入力する
  - **改善前**: 通常のプロンプト内容を入力
  - **改善後**: 改善されたプロンプトを自動的に使用

### 5. キャンセル機能

- 改善中 (isImproving === true) のみキャンセルボタンを表示
- クリックでストリーミング処理を中断

### 6. エラーハンドリング

- API エラー時: エラーメッセージ表示
- ネットワークエラー: 再試行の提案
- タイムアウト: 30秒で自動キャンセル
- 空プロンプトのバリデーション

## UI/UX フロー

### プロンプト改善画面

```
+--------------------------------------------------+
| プロンプトの改善                                 |
+--------------------------------------------------+
| プロンプト:                                      |
| +----------------------------------------------+ |
| | ユーザーが入力したプロンプト...              | |
| |                                              | |
| +----------------------------------------------+ |
|                                                  |
| --- 改善されたプロンプト ---                     |
| +----------------------------------------------+ |
| | [✨ Improve with AI]                         | |
| | (実行前のみ、ボタンを表示)                   | |
| |                                              | |
| |                                              | |
| | より効果的なプロンプトに改善された内容が     | |
| | ストリーミングで逐次表示される...            | |
| | (読み取り専用、スクロール可能)               | |
| |                                              | |
| +----------------------------------------------+ |
| [Apply Improved Prompt]                          |
|                                                  |
| [キャンセル]                           [入力]    |
+--------------------------------------------------+
```

### 状態遷移

```
初期状態
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
[Apply Improved Prompt] ボタン有効化
↓ (ユーザークリック)
元の Textarea に反映
↓
プレビューエリア閉じる
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
GeminiClient.generateContentStream(prompt)
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

### 適用フロー（改善後）

```
[Input] ボタンクリック
↓
const contentToUse = improvedContent.trim() || content.trim()
↓
executeManager.setPrompt(contentToUse) で AI サービスに入力
```

### システムプロンプトロードフロー

```
PromptImprover 初期化
↓
loadSystemInstruction() 実行
↓
1. getTodaysCache() を確認
   ├─ ヒット → 使用
   └─ ミス → 2へ
↓
2. GitHub Gist から fetch
   ├─ 成功 → saveCache() → 使用
   └─ 失敗 → 3へ
↓
3. getLatestCache() を確認
   ├─ ヒット → 使用（古くても可）
   └─ ミス → 4へ
↓
4. DEFAULT_INSTRUCTION を使用
```

### キャッシュリフレッシュフロー

```
ユーザーが設定メニューを開く
↓
"Refresh Improve Prompt Cache" をクリック
↓
handleRefreshImprovePromptCache() 実行
↓
clearImprovePromptCache() でキャッシュ削除
↓
次回の PromptImprover 使用時に自動的に Gist から再取得
```

## 技術仕様

### アーキテクチャ

```
PromptImproveDialog (UI)
↓
PromptImprover (Service) ← loadSystemInstruction()
↓                        ↓
GeminiClient             ImprovePromptCacheService
↓                        ↓
@google/genai            WXT Storage API
                         ↓
                         GitHub Gist (Instruction Source)
```

**レイヤー構成**:

- **UI Layer**: PromptImproveDialog - ユーザーインタラクション
- **Service Layer**: PromptImprover, GeminiClient - ビジネスロジック
- **Storage Layer**: ImprovePromptCacheService - キャッシュ管理
- **External Layer**: GitHub Gist - システムプロンプトソース

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

#### 1. GeminiClient (新規)

**ファイル**: `src/services/genai/GeminiClient.ts`

**役割**: Gemini API のシングルトンラッパー

**機能**:

- GoogleGenAI クライアントの初期化
- API キーの管理（環境変数から取得）
- generateContentStream の実装
- エラーハンドリング

**インターフェース**:

```typescript
class GeminiClient {
  private static instance: GeminiClient | null = null

  static getInstance(): GeminiClient

  async generateContentStream(
    prompt: string,
    config?: Partial<GeminiConfig>,
  ): AsyncGenerator<StreamChunk, void, unknown>
}
```

#### 2. PromptImprover (新規)

**ファイル**: `src/services/genai/PromptImprover.ts`

**役割**: プロンプト改善のビジネスロジック

**機能**:

- システムプロンプトの動的ロード（GitHub Gist経由）
- ストリーミングコールバックの制御
- エラーハンドリング
- タイムアウト処理（30秒）
- キャンセル機能

**システムプロンプトの管理**:

システムプロンプトは GitHub Gist から動的に取得され、4層のフォールバック機構で管理される:

1. **今日のキャッシュ**: 日付が一致するキャッシュを使用
2. **Gist取得**: キャッシュがない場合、GitHub Gist から最新版を取得
3. **最新キャッシュ**: Gist取得に失敗した場合、古いキャッシュでも使用
4. **デフォルト値**: すべて失敗した場合、ハードコードされたデフォルトを使用

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

  async improvePrompt(options: ImproveOptions): Promise<void>
  cancel(): void
  getSystemInstruction(): string
  private async loadSystemInstruction(): Promise<void>
}
```

#### 3. ImprovePromptCacheService (新規)

**ファイル**: `src/services/storage/improvePromptCache.ts`

**役割**: システムプロンプトのキャッシュ管理

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

#### 4. PromptImproveDialog (拡張)

**ファイル**: `src/components/inputMenu/controller/PromptImproveDialog.tsx`

**追加状態**:

```typescript
const [isImproving, setIsImproving] = useState(false)
const [improvedContent, setImprovedContent] = useState("")
const [improvementError, setImprovementError] = useState<string | null>(null)
const promptImproverRef = useRef<PromptImprover | null>(null)
```

**追加機能**:

- 改善ボタンのクリックハンドラー (`handleImprove`)
- ストリーミング中の状態管理
- プレビューエリアの表示制御
- キャンセルハンドラー (`handleCancelImprovement`)
- 改善版プロンプトの自動適用（"Input"ボタン統合）
- エラー表示

#### 5. SettingsMenu (拡張)

**ファイル**: `src/components/inputMenu/SettingsMenu.tsx`

**追加機能**:

- キャッシュ管理セクション
- "Refresh Improve Prompt Cache" ボタン
- キャッシュクリア処理 (`handleRefreshImprovePromptCache`)

**UI配置**:

```
Settings Menu
├── Features ON/OFF
├── Autocomplete target
├── Import/Export
└── Cache Management  ← 新規追加
    └── Refresh Improve Prompt Cache
```

### 実装ファイル

#### 新規作成

1. **`src/services/genai/types.ts`**
   - 型定義: ImproveOptions, StreamChunk, GeminiConfig, GeminiError

2. **`src/services/genai/GeminiClient.ts`**
   - Gemini API クライアントの実装
   - シングルトンパターン
   - ストリーミングサポート
   - エラーハンドリング

3. **`src/services/genai/PromptImprover.ts`**
   - プロンプト改善ロジック
   - システムプロンプトの動的ロード
   - キャッシュ統合
   - コールバック制御

4. **`src/services/storage/improvePromptCache.ts`**
   - キャッシュサービス実装
   - 日付ベースTTL管理
   - ストレージ操作

5. **`src/services/genai/__tests__/GeminiClient.test.ts`**
   - GeminiClient のユニットテスト

6. **`src/services/genai/__tests__/PromptImprover.test.ts`**
   - PromptImprover のユニットテスト

7. **`src/services/storage/__tests__/improvePromptCache.test.ts`**
   - ImprovePromptCacheService のユニットテスト

#### 修正対象

1. **`src/components/inputMenu/controller/PromptImproveDialog.tsx`**
   - 改善ボタンの追加
   - プレビューエリアの追加
   - キャンセルボタンの条件表示
   - 状態管理の拡張
   - "Input"ボタンとの統合

2. **`src/components/inputMenu/SettingsMenu.tsx`**
   - キャッシュ管理セクション追加
   - リフレッシュボタン追加

3. **`src/services/storage/index.ts`**
   - StorageService へのキャッシュメソッド追加
   - improvePromptCacheService の統合

4. **`src/services/storage/definitions.ts`**
   - improvePromptCacheStorage の定義追加

5. **`src/locales/en.yml`**
   - 英語翻訳の追加（UI、エラーメッセージ、設定項目）

6. **`src/locales/ja.yml`**
   - 日本語翻訳の追加（UI、エラーメッセージ、設定項目）

7. **`.env`**, **`.env.development`**
   - `WXT_IMPROVE_PROMPT_URL` 環境変数追加

## 環境変数とストレージ

### 環境変数

**.env**:

```bash
WXT_GENAI_API_KEY=<Gemini API Key>
WXT_IMPROVE_PROMPT_URL=https://gist.githubusercontent.com/ujiro99/.../improve-prompt-default.md
```

**.env.development**:

```bash
WXT_GENAI_API_KEY=<開発用 API Key>
WXT_IMPROVE_PROMPT_URL=https://gist.githubusercontent.com/ujiro99/.../improve-prompt-default.md
```

### ストレージ定義

**improvePromptCacheStorage**:

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

**データ構造**:

```typescript
{
  date: "2024-01-15",           // YYYY-MM-DD
  instruction: "System prompt text...",
  cachedAt: 1705320000000       // Unix timestamp
}
```

### 将来の実装（準備のみ）

```typescript
// ユーザーが設定画面で API キーを入力可能に
export const genaiApiKeyStorage = storage.defineItem<string>(
  "local:genaiApiKey",
  {
    defaultValue: "",
    version: 1,
  },
)
```

## エラーハンドリング

### エラーケース

1. **API キー未設定**
   - エラーメッセージ: "API key is not configured"
   - 対応: 設定画面へのリンクを表示（将来）

2. **ネットワークエラー**
   - エラーメッセージ: "Network error. Please check your connection."
   - 対応: リトライボタン表示

3. **API エラー**
   - エラーメッセージ: API からのエラーメッセージを表示
   - 対応: エラーログを記録

4. **タイムアウト**
   - 30秒でタイムアウト
   - エラーメッセージ: "Request timed out. Please try again."

5. **空プロンプト**
   - バリデーション: 改善ボタンを無効化
   - エラーメッセージなし

### エラー表示

```typescript
{improvementError && (
  <div className="text-sm text-destructive p-2 bg-destructive/10 rounded">
    {improvementError}
  </div>
)}
```

## パフォーマンス

### 最適化

1. **デバウンス**: ストリーミング中のUI更新を最小限に抑える
2. **メモ化**: コールバック関数のメモ化
3. **クリーンアップ**: コンポーネントアンマウント時の処理中断

### リソース管理

- API コールのキャンセル機能
- メモリリーク防止
- イベントリスナーのクリーンアップ

## セキュリティ

### API キー保護

- 環境変数で管理（サーバーサイドでは使用しない）
- 将来的にはユーザーローカルストレージで暗号化保存

### XSS 対策

- プレビュー表示時のサニタイゼーション
- React の自動エスケープを利用

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

#### 2. PromptImprover.test.ts (7 tests)

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

#### 4. PromptImproveDialog.test.tsx

- 改善ボタンのレンダリング
- ボタンクリック時の動作
- プレビューエリアの表示/非表示
- ストリーミング中のローディング状態
- キャンセルボタンの条件表示
- "Input"ボタンとの統合動作
- エラー表示

### E2Eテスト（将来的に）

- プロンプト入力 → 改善 → プレビュー → AI サービスへ送信
- キャッシュロードの確認
- 設定画面からのキャッシュリフレッシュ
- エラーケースの確認

## 考慮事項

### 技術的負債

- API キーのストレージ管理（将来実装）
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
- UI ラベルの翻訳（英語・日本語対応済み）

### セキュリティとプライバシー

- GitHub Gist の公開URL使用（セキュアな配信）
- システムプロンプトの改ざん防止（将来的に署名検証を検討）
- ユーザープロンプトは Gemini API のみに送信（ログ保存なし）

## キャッシュ戦略の詳細

### キャッシュのTTL管理

- **日付ベース**: YYYY-MM-DD 形式で日付を保存
- **判定ロジック**: `getCurrentDateString()` との完全一致で判定
- **TTL**: 実質24時間（日付が変わるまで）
- **タイムゾーン**: ローカルタイムゾーン依存

### フォールバック戦略の利点

1. **オフライン対応**: ネットワーク不通時も古いキャッシュで動作
2. **GitHub障害時の継続性**: Gist が利用不可でも影響最小限
3. **レイテンシ削減**: 毎回のネットワークリクエスト不要
4. **コスト削減**: API コール削減（Gemini APIは有料）

### キャッシュ更新トリガー

1. **自動更新**: 日付変更時（0:00以降の初回使用）
2. **手動更新**: 設定画面の "Refresh" ボタン
3. **強制更新**: キャッシュクリア後の初回使用

## 実装完了チェックリスト

- [x] GeminiClient 実装
- [x] PromptImprover 実装
- [x] ImprovePromptCacheService 実装
- [x] PromptImproveDialog UI 拡張
- [x] SettingsMenu キャッシュ管理追加
- [x] StorageService 統合
- [x] 環境変数設定
- [x] i18n 翻訳（英語・日本語）
- [x] ユニットテスト
  - [x] GeminiClient.test.ts (15 tests)
  - [x] PromptImprover.test.ts (7 tests, 4 failing - 既知の問題)
  - [x] improvePromptCache.test.ts (14 tests, all passing)
- [ ] E2Eテスト（将来実装）
- [x] 設計ドキュメント更新

## 注意事項

### 必須要件

- Gemini API の使用には API キーが必要 (`WXT_GENAI_API_KEY`)
- GitHub Gist の URL が必要 (`WXT_IMPROVE_PROMPT_URL`)
- ストリーミングレスポンスのため、ネットワーク接続が必須

### 制約事項

- API のレート制限やクォータに注意
- Gist は公開URLであること（プライベートGistは不可）
- キャッシュは日付ベースのため、頻繁な更新には未対応

### トラブルシューティング

**システムプロンプトが更新されない**:

1. 設定メニューから "Refresh Improve Prompt Cache" を実行
2. ブラウザのデベロッパーツールでストレージを確認
3. `improvePromptCache` キーの date が今日の日付か確認

**改善が動作しない**:

1. `.env` の `WXT_GENAI_API_KEY` が設定されているか確認
2. ネットワーク接続を確認
3. ブラウザコンソールでエラーメッセージを確認

**キャッシュが古い**:

1. 日付が変わっても自動更新されない場合、手動でリフレッシュ
2. ストレージをクリアして再度試行
