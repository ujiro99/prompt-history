# E2Eテスト環境設計書

## 1. プロジェクト概要

本設計書は、プロンプト履歴管理ブラウザ拡張機能におけるコンテンツスクリプトのAIサービス上での動作を検証するためのE2E（End-to-End）テスト環境の構築を目的とする。

### 目的

- コンテンツスクリプトが各AIサービスで正常に動作することを自動検証
- リグレッションの早期発見と防止
- 新機能追加時の既存機能への影響確認

## 2. 現状分析

### 現在のテスト環境

- **単体テスト**: Vitest + React Testing Library
- **テストカバレッジ**: services/aiService/base配下の基本機能
- **テスト対象**: DOM操作、イベントハンドリング、基本的なビジネスロジック

### サポート済みAIサービス

- **ChatGPT** (chat.openai.com)
- **Google Gemini** (gemini.google.com)
- **Perplexity** (perplexity.ai)

### アーキテクチャ概要

- BaseAIServiceを基底クラスとした拡張可能な設計
- DomManagerによるDOM操作の抽象化
- サービス固有の設定を外部定義ファイルで管理

## 3. E2Eテスト要件

### テスト対象機能

#### コア機能

1. **拡張機能の初期化**
   - コンテンツスクリプトの注入
   - 各AIサービスサイトでの起動確認

2. **DOM要素の検出**
   - プロンプト入力フィールドの検出
   - 送信ボタンの検出
   - サービス固有要素の認識

3. **イベント処理**
   - テキスト入力イベントの監視
   - 送信ボタンクリックの検出
   - プロンプト内容の取得

4. **データ永続化**
   - プロンプト履歴の保存
   - ストレージAPIとの連携
   - データの取得と表示

5. **UI コンポーネント**
   - InputPopupの表示と操作
   - AutocompletePopupの表示と候補選択
   - ツールチップとメニューの動作

### 非機能要件

- **パフォーマンス**: ページ読み込み時間への影響が最小限
- **互換性**: Chrome/Firefox両ブラウザでの動作
- **安定性**: AIサービスのDOM変更に対する耐性

## 4. 技術スタック設計

### 採用技術

| 技術             | バージョン | 用途                          |
| ---------------- | ---------- | ----------------------------- |
| Playwright       | 1.40.1+    | ブラウザ自動化・E2Eテスト実行 |
| TypeScript       | 5.8.3      | 型安全なテスト記述            |
| WXT              | 0.20.6     | 拡張機能のビルドと設定管理    |
| @playwright/test | 1.40.1+    | テストランナー・アサーション  |

### ブラウザサポート

- **主要**: Chromium (Desktop Chrome)
- **副次**: Firefox (Desktop Firefox)

## 5. プロジェクト構造設計

```
prompt-history/
├── e2e/                                # E2Eテストルートディレクトリ
│   ├── tests/                          # テストスペックファイル
│   │   ├── extension-detection.spec.ts # 拡張機能基盤テスト（最重要）
│   │   ├── chatgpt.spec.ts             # ChatGPT固有のテスト
│   │   ├── gemini.spec.ts              # Gemini固有のテスト
│   │   ├── perplexity.spec.ts          # Perplexity固有のテスト
│   │   ├── common.spec.ts              # 共通機能のテスト
│   │   └── ui-components.spec.ts       # UIコンポーネントテスト
│   ├── fixtures/                       # テスト用フィクスチャ
│   │   ├── extension.ts                # 拡張機能セットアップ
│   │   ├── ai-services.ts              # AIサービス共通設定
│   │   └── test-data.ts                # テストデータ定義
│   ├── page-objects/                   # Page Objectパターン
│   │   ├── BasePage.ts                 # 基底ページクラス
│   │   ├── ChatGPTPage.ts              # ChatGPTページオブジェクト
│   │   ├── GeminiPage.ts               # Geminiページオブジェクト
│   │   ├── PerplexityPage.ts           # Perplexityページオブジェクト
│   │   └── components/                 # UIコンポーネントオブジェクト
│   │       ├── InputPopup.ts           # InputPopupオブジェクト
│   │       └── AutocompletePopup.ts    # AutocompletePopupオブジェクト
│   └── utils/                          # テストユーティリティ
│       ├── extension-helpers.ts        # 拡張機能操作ヘルパー
│       ├── wait-helpers.ts             # 待機処理ヘルパー
│       └── storage-helpers.ts          # ストレージ操作ヘルパー
├── playwright.config.ts                # Playwright設定ファイル
└── package.json                        # 依存関係とスクリプト
```

## 6. 設定ファイル設計

### playwright.config.ts

```typescript
import { defineConfig, devices } from "@playwright/test"
import path from "path"

export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html"], ["junit", { outputFile: "test-results/junit.xml" }]],

  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    headless: process.env.CI ? true : false,
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // 拡張機能のロード設定
        contextOptions: {
          // ビルド済み拡張機能のパス
          extensionPath: path.join(__dirname, ".output/chrome-mv3"),
        },
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        contextOptions: {
          extensionPath: path.join(__dirname, ".output/firefox-mv2"),
        },
      },
    },
  ],

  // テスト前のグローバル設定
  globalSetup: "./e2e/fixtures/global-setup.ts",
  globalTeardown: "./e2e/fixtures/global-teardown.ts",
})
```

## 7. テストシナリオ設計

### 基本テストフロー

1. **拡張機能のロード**
   - ビルド済み拡張機能のパスを指定
   - ブラウザコンテキストに拡張機能を注入
   - 拡張機能の初期化完了を確認

2. **対象AIサービスページの訪問**
   - 各AIサービスのURLにナビゲート
   - ページの完全読み込みを待機

3. **コンテンツスクリプトの動作確認**
   - コンテンツスクリプトの注入確認
   - 初期化処理の完了確認
   - コンソールエラーの監視

4. **入力欄と送信ボタンの検出確認**
   - プロンプト入力フィールドの存在確認
   - 送信ボタンの存在確認
   - サービス固有のセレクタが正しく動作することを検証

5. **プロンプト入力の確認**
   - テキストエリアへの手動文字入力
   - 入力イベントの発火確認
   - 入力内容の正確な取得

6. **入力欄からのプロンプト検出の確認**
   - 入力内容変更時のイベントリスナー動作
   - プロンプトテキストの抽出精度
   - 複数行テキストの処理

7. **UI表示の確認**
   - **InputPopup**
     - トリガー要素のホバー/クリックでの表示
     - 履歴リストの表示
     - 項目選択と入力フィールドへの反映
   - **AutocompletePopup**
     - 入力中の候補表示トリガー
     - 候補リストの動的更新
     - キーボードナビゲーション（上下キー）
     - Tabキーでの選択確定
     - Escキーでのキャンセル

### 具体的テストケース

#### 拡張機能基盤テスト（extension-detection.spec.ts）

**位置づけ**: E2Eテストスイートの最重要・基盤テストファイル

**テスト対象**:

- **拡張機能注入検証**: コンテンツスクリプトの正常な注入確認
- **ストレージAPI統合**: chrome.storage APIへのアクセス確認
- **プロンプト履歴管理**: 履歴データのCRUD操作テスト
- **マニフェスト情報取得**: 拡張機能メタデータの読み取り
- **権限確認**: 必要なChrome API権限の検証

**実行優先度**: 最高（他のテストの前提条件）

**カバレッジ範囲**:

```typescript
// 主要テストケース
- should detect extension injection on ChatGPT
- should have access to extension storage
- should handle prompt history storage
- should detect extension manifest information
- should verify extension permissions
```

#### 共通機能テスト

- 拡張機能の有効化/無効化
- 複数タブでの同時動作
- ブラウザ再起動後の状態保持
- メモリリークの検証

## 8. Page Objectパターン設計

### BasePage（基底クラス）

```typescript
export abstract class BasePage {
  constructor(protected page: Page) {}

  // 共通メソッド
  async waitForExtensionLoad(): Promise<void>
  async getPromptInput(): Promise<Locator>
  async getSendButton(): Promise<Locator>
  async typePrompt(text: string): Promise<void>
  async submitPrompt(): Promise<void>
  async verifyHistoryStorage(): Promise<boolean>

  // UI要素の取得
  async getInputPopup(): Promise<InputPopup>
  async getAutocompletePopup(): Promise<AutocompletePopup>

  // 抽象メソッド（サービス固有実装）
  abstract getServiceSpecificSelectors(): Selectors
  abstract waitForServiceReady(): Promise<void>
}
```

### サービス固有Page Object

サービス固有のセレクタは、 ${サービス名}Definitions.ts で管理し、Page Objectで利用する。

```typescript
// ChatGPTPage の例

import { CHATGPT_DEFINITIONS } from "@/services/aiService/chatgpt/chatGptDefinitions"

const selectors = CHATGPT_DEFINITIONS.selectors

export class ChatGPTPage extends BasePage {
  async waitForServiceReady(): Promise<void> {
    // ChatGPTの入力欄が表示されるまで待機
    await this.page.waitForSelector(selectors.promptInput[0])
  }

  getServiceSpecificSelectors(): Selectors {
    return {
      promptInput: selectors.promptInput[0],
      sendButton: selectors.sendButton[0],
    }
  }
}
```

## 9. CI/CD統合設計

### package.jsonスクリプト

```json
{
  "scripts": {
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui",
    "e2e:headed": "playwright test --headed",
    "e2e:debug": "playwright test --debug",
    "e2e:install": "playwright install --with-deps",
    "e2e:report": "playwright show-report",
    "pre-e2e": "pnpm build && pnpm e2e:install"
  }
}
```

### GitHub Actions設定

```yaml
name: E2E Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install

      - name: Build extension
        run: pnpm build

      - name: Install Playwright
        run: pnpm e2e:install

      - name: Run E2E tests
        run: pnpm e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
```

## 10. 実装フェーズ

### Phase 1: 基盤構築

- Playwright環境のセットアップ
- 基本設定ファイルの作成
- ディレクトリ構造の整備
- 拡張機能ロード用フィクスチャの実装

### Phase 2: コアテスト実装

- ChatGPT向け基本テストの実装
- Page Objectパターンの基盤構築
- InputPopup/AutocompletePopupのテスト実装
- ストレージ連携テストの作成

### Phase 3: 全サービス対応

- Gemini向けテストの実装
- Perplexity向けテストの実装
- サービス間の共通テストケース抽出
- エラーハンドリングテストの追加

### Phase 4: CI/CD統合と最適化

- GitHub Actions設定の実装
- テストレポートの自動生成
- パフォーマンステストの追加
- テスト実行時間の最適化

## 11. 技術的課題と対策

### 課題1: 拡張機能の動的ロード

**課題**: Playwrightで拡張機能を正しくロードする必要がある
**対策**:

- カスタムフィクスチャでの拡張機能パス指定
- manifest.jsonの動的生成
- 開発ビルドとプロダクションビルドの使い分け

### 課題2: AIサービスの認証

**課題**: テスト実行時にログインが必要
**対策**:

- テスト用アカウントの準備
- 認証状態の保持機能
- 必要に応じてモックサービスの利用

### 課題3: DOM要素の動的変化

**課題**: AIサービスのUI更新により要素が見つからない
**対策**:

- 堅牢な待機戦略の実装
- 複数のセレクタ候補の準備
- 定期的なセレクタの更新プロセス

### 課題4: クロスブラウザ対応

**課題**: Chrome/Firefox間での動作差異
**対策**:

- ブラウザ固有の処理を抽象化
- Manifest V2/V3の差異吸収
- 条件分岐による適切な処理分け

### 課題5: テスト実行時間

**課題**: E2Eテストの実行時間が長い
**対策**:

- 並列実行の活用
- 重要度に応じたテストの階層化
- スモークテストとフルテストの分離

## 12. 成功指標

### 定量的指標

- **テストカバレッジ**: 主要機能の80%以上
- **実行時間**: 全テスト5分以内
- **成功率**: CI環境で95%以上

### 定性的指標

- デプロイ前の不具合検出率向上
- 開発者の手動テスト工数削減
- リリースサイクルの短縮

## 13. まとめ

本設計書に基づいてE2Eテスト環境を構築することで、以下の効果が期待できる：

1. **品質向上**: 自動テストによる継続的な品質保証
2. **開発効率化**: リグレッションの早期発見と修正
3. **信頼性向上**: 各AIサービスでの動作保証
4. **保守性向上**: Page Objectパターンによるテストコードの保守性

段階的な実装により、リスクを最小限に抑えながら確実にE2Eテスト環境を構築し、プロダクトの品質向上に貢献する。
