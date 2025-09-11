# オートコンプリート機能設計書

## 概要

ChatGPTのテキスト入力欄で、ユーザーが入力した文字列が保存済みプロンプトの名前とマッチした場合に、エディタライクなオートコンプリートポップアップを表示する機能を実装する。

## 要件

### 機能要件

1. **リアルタイム候補表示**
   - ユーザーがテキスト入力中に、キャレット位置までの文字列を解析
   - 保存済みプロンプト名との前方一致・部分一致判定
   - マッチした候補を小さなポップアップで表示

2. **キーボードナビゲーション**
   - 上下矢印キーで候補選択
   - Enterキーで候補確定・テキスト置換
   - Escapeキーでポップアップ閉じる

3. **位置調整**
   - キャレット位置に基づくポップアップの絶対位置決め
   - 画面端での自動位置調整

### 非機能要件

1. **パフォーマンス**
   - デバウンス処理でCPU負荷軽減（200ms）
   - 候補数上限設定（最大5件）

2. **互換性**
   - 既存のDomManager機能との協調動作
   - ChatGPTのUI変更への対応

## 技術仕様

### アーキテクチャ

```
DomManager (既存)
├── AutoCompleteManager (新規)
│   ├── カーソル位置取得
│   ├── 候補マッチング
│   └── ポップアップ制御
└── AutoCompleteUI (新規)
    ├── ポップアップコンポーネント
    ├── 候補リスト表示
    └── キーボードハンドリング
```

### キャレット位置取得

#### アルゴリズム

- textarea/input要素: `selectionStart`プロパティを使用
- contenteditable要素: Selection APIとRangeを使用してキャレット位置を計算
- 要素タイプを自動判定して適切な方法を選択

#### インタフェース

```typescript
getCaretPosition(element: Element): number
```

### 候補マッチング

#### アルゴリズム

1. キャレット位置までの文字列を取得
2. 単語境界を特定（正規表現: `(\S+)$`）
3. 検索語を抽出し、プロンプト名との大文字小文字を区別しない部分一致
4. マッチした候補を最大5件まで返却

#### データ構造

```typescript
interface AutoCompleteMatch {
  name: string
  content: string
  matchStart: number
  matchEnd: number
}
```

#### インタフェース

```typescript
findMatches(input: string, caretPos: number, prompts: Prompt[]): AutoCompleteMatch[]
```

### UI コンポーネント

```typescript
interface AutoCompletePopupProps {
  matches: AutoCompleteMatch[]
  selectedIndex: number
  position: { x: number; y: number }
  onSelect: (match: AutoCompleteMatch) => void
  onClose: () => void
}
```

## 実装ファイル

### 新規作成

1. `services/autoComplete/`
   - `autoCompleteManager.ts` - オートコンプリート機能のコア実装
   - `types.ts` - AutoComplete関連の型定義

2. `components/autoComplete/`
   - `AutoCompletePopup.tsx` - オートコンプリートポップアップUI
   - `AutoCompleteItem.tsx` - 個別候補アイテムコンポーネント

### 修正対象

1. `services/dom.ts`
   - キャレット位置取得ヘルパー関数追加

2. `services/chatgpt/domManager.ts`
   - オートコンプリート機能統合
   - 既存のコンテンツ変更監視拡張

## データフロー

```
ユーザー入力
↓
DomManager.handleContentChange (既存)
↓
AutoCompleteManager.analyzeInput (新規)
↓
候補マッチング
↓
AutoCompletePopup表示 (新規)
↓
ユーザー選択
↓
テキスト置換 & ポップアップ閉じる
```

## 考慮事項

### セキュリティ

- XSS対策：候補テキストのサニタイゼーション
- DOM操作の安全性確保

### パフォーマンス

- 大量プロンプトでの検索最適化
- メモリリーク防止

### UX

- 視覚的フィードバック
- アクセシビリティ対応
- モバイル対応

## テストケース

1. **基本機能**
   - 前方一致候補表示
   - 部分一致候補表示
   - 候補選択・テキスト置換

2. **エッジケース**
   - 候補なしの場合
   - 長いプロンプト名の処理
   - 特殊文字を含む名前

3. **インタラクション**
   - キーボードナビゲーション
   - マウス操作
   - ポップアップ外クリック

4. **パフォーマンス**
   - 大量データでの応答性
   - メモリ使用量
