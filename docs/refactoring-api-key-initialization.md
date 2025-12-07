# API Key初期化のリファクタリング設計

## 概要

Gemini API keyの初期化を一元化し、サービスクラスからの冗長な`getGenaiApiKey()`呼び出しを削除する。初期化の責務をReact層（`AiModelContext`）に移動する。

## 現在の状態

### 現在のアーキテクチャ

```
┌─────────────────────────────┐
│ AiModelContext              │
│ - API keyの状態を管理       │
│ - getGenaiApiKey()を呼び出し│
└─────────────────────────────┘

┌─────────────────────────────┐
│ PromptImprover              │
│ - getGenaiApiKey()を呼び出し│──┐
│ - GeminiClientを初期化      │  │
└─────────────────────────────┘  │
                                 │
┌─────────────────────────────┐  │  各サービスが独立して
│ CostEstimatorService        │  ├─ API keyを取得し
│ - getGenaiApiKey()を呼び出し│  │  GeminiClientを初期化
│ - GeminiClientを初期化      │  │
└─────────────────────────────┘  │
                                 │
┌─────────────────────────────┐  │
│ SuccessMessageGenerator     │  │
│ - getGenaiApiKey()を呼び出し│──┤
│ - GeminiClientを初期化      │  │
└─────────────────────────────┘  │
                                 │
┌─────────────────────────────┐  │
│ TemplateGeneratorService    │  │
│ - getGenaiApiKey()を呼び出し│──┘
│ - GeminiClientを初期化      │
└─────────────────────────────┘
```

### 問題点

1. **コードの重複**: 各サービスが同一の`loadApiKey()`メソッドを持つ
2. **複数のAPI Key取得**: 同じAPI keyが複数回取得される
3. **不整合な状態**: サービス間で初期化状態が異なる可能性がある
4. **保守性の低下**: API keyロジックの変更に複数ファイルの更新が必要

## 提案アーキテクチャ

### 設計アプローチ

`AiModelContext`で`GeminiClient`の初期化を一元化し、既存のAPI key管理機能を活用する。

```
┌─────────────────────────────────────────┐
│ AiModelContext                          │
│ - API keyの状態を管理                   │
│ - getGenaiApiKey()を呼び出し            │
│ - GeminiClient singletonを初期化        │◄──── 単一の情報源
│ - API key変更を監視                     │
│ - key更新時に再初期化                   │
└─────────────────────────────────────────┘
                    │
                    │ 初期化済みsingleton
                    ▼
          ┌──────────────────┐
          │  GeminiClient    │
          │  (Singleton)     │
          └──────────────────┘
                    │
        ┌───────────┼───────────┬───────────┐
        │           │           │           │
        ▼           ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Prompt   │ │ Cost     │ │ Success  │ │ Template │
│ Improver │ │ Estimator│ │ Message  │ │ Generator│
└──────────┘ └──────────┘ └──────────┘ └──────────┘
 - API key   - API key    - API key    - API key
   ロジックなし ロジックなし  ロジックなし  ロジックなし
 - 初期化済み - 初期化済み  - 初期化済み  - 初期化済み
   clientを使用 clientを使用  clientを使用  clientを使用
```

### 利点

1. **単一責任**: API key管理が一箇所に集約される
2. **自動更新**: API key変更が全サービスに自動的に伝播する
3. **シンプルなサービス**: サービスはビジネスロジックにのみ専念
4. **一貫性のある状態**: 全サービスが同じ初期化済みclientを使用
5. **テスタビリティの向上**: API keyのモック・スタブが容易

## 実装手順

### ステップ1: AiModelContextの拡張

**ファイル**: `src/contexts/AiModelContext.tsx`

**変更内容**:

- `GeminiClient`をインポート
- API key読み込み時に`GeminiClient`を初期化
- API key変更時に再初期化

**主要ロジック**:

- マウント時: API keyを取得 → GeminiClientを初期化
- API key変更時: GeminiClientを再初期化
- 初期化状態を利用側コンポーネント向けにエクスポート

### ステップ2: サービスからAPI Keyロジックを削除

**変更対象ファイル**:

- `src/services/genai/PromptImprover.ts`
- `src/services/promptOrganizer/CostEstimatorService.ts`
- `src/services/promptOrganizer/SuccessMessageGeneratorService.ts`
- `src/services/promptOrganizer/TemplateGeneratorService.ts`

**各サービスの変更内容**:

1. `import { getGenaiApiKey } from "@/services/storage/genaiApiKey"`を削除
2. `loadApiKey()`メソッドを削除
3. メソッド内の`loadApiKey()`呼び出しを削除
4. 初期化チェックを簡素化し、`geminiClient.isInitialized()`のみに依存

### ステップ3: サービス初期化パターンの更新

**変更前**:

```typescript
// サービスが初期化をチェックし、必要に応じてAPI keyをロード
if (!this.geminiClient.isInitialized()) {
  await this.loadApiKey()
}
```

**変更後**:

```typescript
// サービスはAiModelContextによる初期化を前提とする
// 初期化を確認し、未初期化の場合はエラーをthrow
if (!this.geminiClient.isInitialized()) {
  throw new Error(
    "API key not configured. Please set your API key in settings.",
  )
}
```

### ステップ4: テスト戦略

**ユニットテスト**:

- `GeminiClient.getInstance()`をモックし、初期化済みclientを返す
- clientが未初期化の場合にサービスがエラーをthrowすることを検証
- 初期化済みclientでサービスが正しく動作することをテスト

**統合テスト**:

- `AiModelContext`がマウント時に`GeminiClient`を初期化することを検証
- API key変更時に`GeminiClient`が再初期化されることを検証
- エンドツーエンドフロー: API key更新 → サービスが新しいkeyを使用

## 移行時の安全性

### 後方互換性

移行中、サービスは後方互換性を維持:

- `GeminiClient`が既に初期化済み（`AiModelContext`による）の場合は使用
- 未初期化の場合は明確なメッセージとともにエラーをthrow

これにより以下を保証:

1. サイレントな失敗なし
2. 明確なエラーメッセージが開発者を適切な設定へ誘導
3. サービスがcontext外で初期化を試みない

### ロールバック計画

問題が発生した場合:

1. `AiModelContext`の変更を元に戻す
2. サービスの`loadApiKey()`メソッドを復元
3. サービスは独立して動作を継続

## エッジケース

### ケース1: React Context外でのサービス利用

**シナリオ**: background scriptや非Reactコードからサービスが呼び出される

**解決策**:

- Background scriptは`getGenaiApiKey()`を使用して直接`GeminiClient`を初期化すべき
- この要件をサービスクラスのコメントに記載
- 非React context向けに`ensureGeminiClientInitialized()`ユーティリティ関数の作成を検討

### ケース2: 処理中のAPI Key変更

**シナリオ**: 長時間実行中の処理中にユーザーがAPI keyを変更

**現在の動作**: 処理は古いkeyで継続

**新しい動作**:

- `AiModelContext`が新しいkeyでclientを再初期化
- 実行中の処理はタイミングにより失敗または成功
- 以降の処理は新しいkeyを使用

**推奨事項**: 変更不要 - 現在の実装と同じ動作

### ケース3: 複数のAPI Key取得元

**シナリオ**: storageからのAPI key vs 環境変数（開発モード）

**現在の動作**: `getGenaiApiKey()`が優先順位ロジックを処理

**新しい動作**: 変更なし - `AiModelContext`が同じ`getGenaiApiKey()`関数を使用

## 実装チェックリスト

- [ ] `AiModelContext`を更新し`GeminiClient`を初期化
- [ ] `PromptImprover`から`loadApiKey()`を削除
- [ ] `CostEstimatorService`から`loadApiKey()`を削除
- [ ] `SuccessMessageGeneratorService`から`loadApiKey()`を削除
- [ ] `TemplateGeneratorService`から`loadApiKey()`を削除
- [ ] エラーメッセージを更新し、ユーザーを設定画面へ誘導
- [ ] 新しい`AiModelContext`の動作に対するユニットテストを追加
- [ ] API key変更フローの統合テストを追加
- [ ] 影響を受けるファイルのドキュメント・コメントを更新
- [ ] 手動テスト: アプリ起動時のAPI key初期化
- [ ] 手動テスト: 実行時のAPI key変更
- [ ] 手動テスト: 各サービスが初期化済みclientで動作

## 関連ファイル

### 変更対象ファイル

- `src/contexts/AiModelContext.tsx`
- `src/services/genai/PromptImprover.ts`
- `src/services/promptOrganizer/CostEstimatorService.ts`
- `src/services/promptOrganizer/SuccessMessageGeneratorService.ts`
- `src/services/promptOrganizer/TemplateGeneratorService.ts`

### 変更なし（引き続き使用）

- `src/services/storage/genaiApiKey.ts` - `AiModelContext`から引き続き使用
- `src/services/genai/GeminiClient.ts` - 変更不要
- `src/hooks/useAiModel.ts` - 変更不要

## 将来の改善案

1. **初期化状態フック**: UI フィードバック用にcontextから`isInitialized`状態をエクスポート
2. **エラーハンドリング**: API key検証の集中エラーハンドリング
3. **ローディング状態**: 初期化中のローディング状態を公開
4. **リトライロジック**: 初期化失敗時の自動リトライ
