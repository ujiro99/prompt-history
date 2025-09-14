# プロンプト保存機能 詳細設計書

## 1. 概要

ChatGPTでのプロンプトの自動保存・手動保存機能を実装する。セッション管理により、プロンプトの呼び出し状態に応じて適切な保存動作を提供する。

## 2. システムアーキテクチャ

### 2.1 サービス層構成

```
┌──────────────────────────────────┐
│           Content Script         │
├──────────────────────────────────┤
│       HistoryManager (統合)      │
├──────────────────────────────────┤
│ StorageHelper │ ExecuteManager   │
│ SessionManager                   │
├──────────────────────────────────┤
│ StorageService │ ChatGptService  │
├──────────────────────────────────┤
│         WXT Storage API          │
└──────────────────────────────────┘
```

### 2.2 主要コンポーネント

#### 統合層

- **HistoryManager**: プロンプト履歴管理の統合クラス（ファサード）

#### ビジネスロジック層

- **StorageHelper**: 保存・削除・ピン留め操作の実行
- **ExecuteManager**: プロンプト実行・取得操作
- **SessionManager**: セッション状態管理

#### サービス層

- **ChatGptService**: ChatGPT固有のサービス（DOM操作統括）
- **StorageService**: プロンプトデータの永続化

#### ChatGPT専用層

- **PromptManager**: DOM操作によるプロンプト抽出・挿入
- **DomManager**: DOM要素の取得・操作
- **ChatGptSelectors**: CSS セレクタ定義

## 3. データ設計

### 3.1 プロンプトデータ構造

```typescript
interface Prompt {
  id: string // UUID
  name: string // プロンプト名
  content: string // プロンプト内容
  executionCount: number // 実行回数
  lastExecutedAt: Date // 最新実行日時
  isPinned: boolean // ピン留めフラグ
  lastExecutionUrl: string // 最終実行URL
  createdAt: Date // 作成日時
  updatedAt: Date // 更新日時
}
```

### 3.2 セッションデータ構造

```typescript
interface Session {
  activePromptId: string | null // 実行中プロンプトID
  url: string // セッション開始URL
  startedAt: Date // セッション開始時刻
}
```

### 3.3 ストレージキー設計

- `prompts`: プロンプト一覧（Map<string, Prompt>）
- `session`: 現在のセッション状態
- `pinnedOrder`: ピン留めプロンプトの順序（string[]）
- `settings`: 設定情報

## 4. ChatGPTサービス仕様

### 4.1 ページ検出

```typescript
const isChatGPT = (): boolean => {
  return (
    window.location.hostname === "chatgpt.com" ||
    window.location.hostname === "chat.openai.com"
  )
}
```

### 4.2 DOM要素セレクタ

```typescript
const SELECTORS = {
  // ChatGPT入力欄（複数のセレクタでフォールバック）
  textInput: [
    "#prompt-textarea",
    '[data-testid="prompt-textarea"]',
    'textarea[placeholder*="Message"]',
    'div[contenteditable="true"]',
  ],
  // 送信ボタン
  sendButton: [
    '[data-testid="send-button"]',
    'button[aria-label*="Send"]',
    'button svg[data-icon="paper-plane"]',
  ],
}
```

### 4.3 イベント監視

- **入力変化**: プロンプト内容の変更検出
- **送信イベント**: 自動保存のトリガー
- **ページ遷移**: セッション状態の更新

## 5. セッション管理仕様

### 5.1 セッション開始条件

```typescript
// プロンプト呼び出し時にセッション開始
startSession(promptId: string): void {
  session = {
    activePromptId: promptId,
    url: window.location.href,
    startedAt: new Date()
  }
}
```

### 5.2 セッション終了条件

- ページリロード/遷移
- 他のプロンプト呼び出し
- 明示的な終了操作

### 5.3 セッション判定ロジック

```typescript
const hasActiveSession = (): boolean => {
  return (
    session?.activePromptId !== null && session?.url === window.location.href
  )
}
```

## 6. 保存動作仕様

### 6.1 自動保存（送信時）

```
送信ボタンクリック検知
↓
プロンプト内容取得
↓
新規プロンプトとして保存（セッション状態無関係）
↓
実行回数インクリメント（セッションありの場合）
```

### 6.2 手動保存

#### セッションなしの場合

```
保存ボタンクリック
↓
プロンプト編集ダイアログ表示
↓
新規プロンプトとして保存
↓
自動ピン留め
```

#### セッションありの場合

```
保存ボタンクリック
↓
プロンプト編集ダイアログ表示
├─ 上書き保存オプション
└─ 別名保存オプション
↓
保存実行
↓
自動ピン留め
```

## 7. UI設計

### 7.1 プロンプト保存ダイアログ

```typescript
interface SaveDialogProps {
  initialName?: string
  initialContent: string
  isOverwriteAvailable: boolean
  onSave: (data: SaveDialogData) => void
  onCancel: () => void
}

interface SaveDialogData {
  name: string
  content: string
  saveMode: "new" | "overwrite"
}
```

### 7.2 保存ボタンの配置

ChatGPT入力欄の近くに以下ボタンを配置：

- **保存ボタン**: 手動保存トリガー
- **履歴ボタン**: 保存済みプロンプト一覧表示

### 7.3 視覚的フィードバック

- 保存成功時: トースト通知
- セッション状態: インジケータ表示
- 自動保存: さりげない表示

## 8. エラーハンドリング

### 8.1 DOM要素の取得失敗

```typescript
const findElement = (selectors: string[]): Element | null => {
  for (const selector of selectors) {
    const element = document.querySelector(selector)
    if (element) return element
  }
  console.warn("Element not found:", selectors)
  return null
}
```

### 8.2 ストレージ操作エラー

- 容量制限時の古いデータ削除
- 保存失敗時のリトライ機構
- ユーザーへの適切なエラー通知

## 9. パフォーマンス考慮事項

### 9.1 DOM監視の最適化

- MutationObserverによる効率的な変更検知
- デバウンス処理による過度な処理抑制
- 必要時のみの要素検索

### 9.2 ストレージアクセスの最適化

- バッチ処理による読み書き効率化
- インメモリキャッシュの活用
- 非同期処理によるUI応答性確保

## 10. 拡張性設計

### 10.1 AIサービス抽象化

```typescript
interface AIServiceInterface {
  isSupported(): boolean
  getTextInput(): Element | null
  getSendButton(): Element | null
  extractPromptContent(): string
  injectPromptContent(content: string): void
  onSend(callback: () => void): void
}
```

**実装例**: ChatGptServiceクラスがこのインターフェースを実装し、
PromptManager、DomManager、ChatGptSelectorsを内部で利用。

### 10.2 将来の対応予定サービス

- Gemini (bard.google.com)
- Claude (claude.ai)
- Perplexity (perplexity.ai)

## 11. 実装優先順位

1. **Phase 1**: 基本データ構造とPromptStorageService
2. **Phase 2**: ChatGPT検出と基本DOM操作（ChatGptService層）
3. **Phase 3**: セッション管理機能（SessionManager）
4. **Phase 4**: 保存操作実装（StorageHelper）
5. **Phase 5**: プロンプト実行機能（ExecuteManager）
6. **Phase 6**: 統合クラス（HistoryManager）
7. **Phase 7**: UI統合とテスト
8. **Phase 8**: エラーハンドリング強化

## 12. テスト方針

### 12.1 ユニットテスト

- PromptStorageServiceの各操作
- StorageHelperの保存・削除ロジック
- SessionManagerのセッション管理
- ExecuteManagerのプロンプト実行ロジック
- ChatGptServiceのDOM操作ユーティリティ

### 12.2 統合テスト

- ChatGPT実環境でのHistoryManager動作確認
- 保存・呼び出し操作の統合検証（StorageHelper + ExecuteManager）
- セッション管理とプロンプト操作の連携確認
- エラーケースの動作確認
