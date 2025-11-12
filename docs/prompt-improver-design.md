# プロンプト改善機能 設計書

## 概要

ユーザーが入力したプロンプトをGemini APIを使用して改善する機能を実装する。
AIが入力プロンプトを分析し、より効果的で明確なプロンプトに改善する。
改善結果はストリーミングでリアルタイムに表示され、ユーザーは改善版を適用するか選択できる。

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

### 4. 適用ボタン

- プレビューエリア下部に配置
- "Apply Improved Prompt" ボタン
- クリックで改善版プロンプトを元の Textarea に反映
- 適用後、プレビューエリアは閉じる

### 5. エラーハンドリング

- API エラー時: エラーメッセージ表示
- ネットワークエラー: 再試行の提案
- タイムアウト: 30秒で自動キャンセル
- 空プロンプトのバリデーション

## 技術仕様

### アーキテクチャ

```
PromptImproveDialog (UI)
↓
PromptImprover (Service)
↓
GeminiClient (API Wrapper)
↓
@google/genai (SDK)
```

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

- システムプロンプトの管理
- ストリーミングコールバックの制御
- エラーハンドリング
- タイムアウト処理

**システムプロンプト**:

```
あなたは優れたPrompt Engineerです。ユーザーが入力したプロンプトを分析し、
より効果的なプロンプトに改善してください。

改善の指針:
- プロンプトの意図と目的を維持する
- 必要に応じて以下の改善を適用する：
  * 曖昧な表現を具体化して明確性を向上
  * 箇条書きやセクション分けで構造化
  * 必要な背景情報や制約条件を補完
- 冗長にならないよう配慮する
- プロンプトの特性（シンプル/複雑、技術的/一般的など）に応じて最適な改善方法を判断する

改善されたプロンプトのみを出力してください。説明や前置きは不要です。
```

**インターフェース**:

```typescript
class PromptImprover {
  async improvePrompt(options: ImproveOptions): Promise<void>
  cancel(): void
}
```

#### 3. PromptImproveDialog (拡張)

**ファイル**: `src/components/inputMenu/controller/PromptImproveDialog.tsx`

**追加状態**:

```typescript
const [isImproving, setIsImproving] = useState(false)
const [improvedContent, setImprovedContent] = useState("")
const [improvementError, setImprovementError] = useState<string | null>(null)
```

**追加機能**:

- 改善ボタンのクリックハンドラー
- ストリーミング中の状態管理
- プレビューエリアの表示制御
- 適用ボタンのハンドラー
- エラー表示

### 実装ファイル

#### 新規作成

1. **`src/services/genai/types.ts`**
   - 型定義: ImproveOptions, StreamChunk, GeminiConfig

2. **`src/services/genai/GeminiClient.ts`**
   - Gemini API クライアントの実装
   - シングルトンパターン
   - ストリーミングサポート

3. **`src/services/genai/PromptImprover.ts`**
   - プロンプト改善ロジック
   - システムプロンプト管理
   - コールバック制御

#### 修正対象

1. **`src/components/inputMenu/controller/PromptImproveDialog.tsx`**
   - 改善ボタンの追加
   - プレビューエリアの追加
   - 適用ボタンの追加
   - 状態管理の拡張

2. **`src/locales/en.yml`**
   - 英語翻訳の追加

3. **`src/locales/ja.yml`**
   - 日本語翻訳の追加

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

### 適用フロー

```
[Apply Improved Prompt] ボタンクリック
↓
setContent(improvedContent)
↓
setImprovedContent('')
```

## 環境変数とストレージ

### 現在の実装

- API キーは `.env` の `WXT_GENAI_API_KEY` から取得
- `import.meta.env.WXT_GENAI_API_KEY` でアクセス

### 将来の実装（準備のみ）

```typescript
// src/services/storage/definitions.ts に追加（今回は未使用）
export const genaiApiKeyStorage = storage.defineItem<string>(
  "local:genaiApiKey",
  {
    defaultValue: "",
    version: 1,
  },
)
```

- ユーザーが設定画面でAPIキーを入力
- ストレージに保存
- 環境変数よりストレージを優先

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

#### 1. GeminiClient.test.ts

- `getInstance()`: シングルトンインスタンスの取得
- `generateContentStream()`: ストリーミングレスポンスの処理
- エラーハンドリング: API エラー、ネットワークエラー

#### 2. PromptImprover.test.ts

- `improvePrompt()`: 正常系フロー
- ストリーミングコールバック: onStream, onComplete, onError
- `cancel()`: 処理の中断
- タイムアウト処理

#### 3. PromptImproveDialog.test.tsx

- 改善ボタンのレンダリング
- ボタンクリック時の動作
- プレビューエリアの表示/非表示
- ストリーミング中のローディング状態
- 適用ボタンの動作
- エラー表示

### E2Eテスト（将来的に）

- プロンプト入力 → 改善 → プレビュー → 適用 → AI サービスへ送信
- エラーケースの確認

## 考慮事項

### 技術的負債

- API キーのストレージ管理（将来実装）
- レート制限への対応
- コスト監視機能（使用量トラッキング）

### UX 改善

- 改善履歴の保存
- 改善前後の比較表示
- カスタマイズ可能な改善スタイル（設定から選択）

### 国際化

- システムプロンプトの多言語対応
- UI ラベルの翻訳

## 注意事項

- Gemini API の使用には API キーが必要
- ストリーミングレスポンスのため、ネットワーク接続が必須
- API のレート制限やクォータに注意
