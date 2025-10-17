# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code) へのガイダンスを提供します。

## プロジェクト概要

これは WXT（Web Extension Toolkit）と React で構築されたブラウザ拡張機能です。このプロジェクトは、ブラウザ拡張機能開発のための WXT の規約ベースの構造に従っています。この拡張機能は、ChatGPTサポートから始まり、AIサービス向けのプロンプト履歴管理機能を提供します。

## 開発コマンド

- `pnpm dev` - Chrome用開発サーバーを起動。3005番ポートを使用
- `pnpm dev:firefox` - Firefox用開発サーバーを起動
- `pnpm build` - Chrome用拡張機能をビルド
- `pnpm build:firefox` - Firefox用拡張機能をビルド
- `pnpm zip` - Chrome用配布可能なZIPを作成
- `pnpm zip:firefox` - Firefox用配布可能なZIPを作成
- `pnpm compile` - ファイル出力なしで型チェックを実行
- `pnpm test` - vitestでユニットテストを実行
- `pnpm lint` - ESLint静的解析を実行
- `pnpm e2e` - Playwrightでエンドツーエンドテストを実行
- `pnpm e2e:ui` - Playwright UIでE2Eテストを実行
- `pnpm e2e:headed` - ヘッドモードでE2Eテストを実行
- `pnpm e2e:debug` - E2Eテストをデバッグ
- `pnpm pre-e2e` - 拡張機能をビルドしてPlaywright依存関係をインストール

## アーキテクチャ

**WXTフレームワーク**: ファイルベースのルーティングと設定よりも規約を重視するWXTのアプローチを使用しています。主要なディレクトリ：

- `entrypoints/` - 拡張機能のエントリーポイント（バックグラウンド、コンテンツスクリプト）
  - `background.ts` - サービスワーカー/バックグラウンドスクリプト
  - `content.ts` - AIサービスドメインで実行されるコンテンツスクリプト
- `src/` - ソースコードディレクトリ
  - `components/` - React UIコンポーネント
  - `services/` - コアビジネスロジックサービス
    - `aiService/` - AIサービス統合
      - `base/` - 抽象基底クラスと共通ユーティリティ
        - `BaseAIService.ts` - AIサービス実装の抽象基底クラス
        - `domManager.ts` - DOM操作とイベント処理
        - `types.ts` - AIサービス共通の型定義
        - `selectorDebugger.ts` - DOMセレクターのデバッグユーティリティ
      - `chatgpt/` - ChatGPTサービス（chat.openai.com、chatgpt.com）
        - `ChatGptService.ts` - ChatGPTサービス実装
      - `gemini/` - Google Geminiサービス（gemini.google.com）
        - `GeminiService.ts` - Geminiサービス実装
      - `claude/` - Claudeサービス（claude.ai）
        - `ClaudeService.ts` - Claudeサービス実装
      - `perplexity/` - Perplexityサービス
        - `PerplexityService.ts` - Perplexityサービス実装
      - `skywork/` - Skyworkサービス
        - `SkyworkService.ts` - Skyworkサービス実装
      - `testPage/` - 開発用テストページ
        - `TestPageService.ts` - テストサービス実装
      - `index.ts` - すべてのAIサービスと設定取得ロジックをエクスポート
    - `autoComplete/` - 自動補完機能
    - `dom/` - DOMユーティリティ関数
    - `promptHistory/` - プロンプト履歴管理
    - `storage/` - データ永続化サービス
  - `types/` - TypeScript型定義
  - `utils/` - ユーティリティ関数
- `public/` - 静的アセットとアイコン
- `assets/` - コード内で参照されるビルド時アセット
- `docs/` - 設計および技術文書
- `e2e/` - Playwrightによるエンドツーエンドテスト
  - `tests/` - 各AIサービスのE2Eテストスペック
  - `page-objects/` - テスト自動化用のPage Object Model
  - `fixtures/` - テストフィクスチャとセットアップ/ティアダウン
  - `utils/` - テストユーティリティ関数
- `pages/` - ランディングページウェブサイト（Next.js）
  - `src/app/[lang]/` - 動的言語ルーティングによる国際化対応ページ
  - `src/components/` - ランディングページ用Reactコンポーネント
  - `src/features/locale/` - 国際化（i18n）辞書
    - `en.ts` - 英語翻訳
    - `ja.ts` - 日本語翻訳
  - `public/` - ランディングページ用静的アセット

**拡張機能の構造**:

- バックグラウンドスクリプトが拡張機能のライフサイクルを処理
- コンテンツスクリプトがAIサービスページにUIウィジェットを注入

**AIサービスアーキテクチャ**:

拡張機能は、シンプルで設定駆動型のアーキテクチャを使用して異なるAIサービスをサポートしています：

- **基盤レイヤー**: `BaseAIService`抽象クラスが共通機能を提供
  - `DomManager`を介したDOM要素の検出と管理
  - 送信アクションとコンテンツ変更のイベント処理
  - リモートJSON設定を使用した設定駆動アプローチ
- **サービス実装**: 各AIサービスは`BaseAIService`を拡張する最小限のクラス
  - ChatGPT: chat.openai.comとchatgpt.comをサポート
  - Gemini: gemini.google.comをサポート
  - Claude: claude.aiをサポート
  - Perplexity: AI検索サービス
  - Skywork: AIサービス
  - TestPage: 開発テスト用サービス
- **設定システム**:
  - サービス設定（DOMセレクター、設定）はリモートエンドポイントから取得
  - エンドポイントURLは `.env` に `WXT_CONFIG_ENDPOINT` として定義
  - 設定ファイルは `pages/public/data/promptHistory.json` に保存
  - 設定は毎日キャッシュされ、フォールバックサポートあり
  - サービスクラスはサービス名とサポートホストのみを定義
- **拡張性**: 新しいAIサービスは以下の手順で簡単に追加可能：
  1. `BaseAIService`を拡張する新しいサービスクラスを作成（通常15行程度）
  2. サービス名とサポートホストを定義
  3. `services/aiService/index.ts`のエクスポートにサービスを追加
  4. リモート設定エンドポイントに設定を追加

**技術スタック**:

- **多言語化**: @wxt-dev/i18n による多言語サポート
- **データ永続化**: クロスブラウザデータストレージ用のWXT Storage API
- **分析**: ユーザー行動分析用の@wxt-dev/analytics
- **テスト**:
  - **ユニットテスト**: React Testing Libraryを使用したVitest
    - テストファイルはソースコードと同じ場所の`__tests__`ディレクトリに配置する
    - 例: `services/dom/elementUtils.ts` → `services/dom/__tests__/elementUtils.test.ts`
  - **E2Eテスト**: Playwrightによるエンドツーエンドテスト
    - `promptHistory.json`の設定を使用してAIサービス統合を検証
    - 保守性の高いテスト自動化のためのPage Object Modelパターン
    - 各AIサービス（ChatGPT、Gemini、Claude、Perplexity、Skywork）の個別テストスペック
    - 拡張機能の機能を包括的にテスト：自動補完、履歴管理、インポート/エクスポート
- **コード品質**: TypeScriptとReactルールを使用したESLint
- **UIフレームワーク**: Tailwind CSSスタイリングを使用したShadcn/uiコンポーネント

**ビルドシステム**:

- React JSXサポート付きTypeScript
- WXTがマニフェスト生成とブラウザ固有のビルドを処理
- `.wxt/tsconfig.json`からベースのtsconfigを拡張

**設計書について**

- `docs/`ディレクトリに設計および技術文書を保存
- 設計書には以下を含む:
  - 機能のコンセプト、要件
  - 機能アーキテクチャ
  - 外部仕様
  - UIフロー
  - 主要な型定義
  - テスト設計
- 設計書には以下を含まない:
  - 実装の詳細
  - コードスニペット

## ランディングページ（pages/）

`pages/` ディレクトリには、GitHub Pages経由でデプロイされる Prompt History サービスランディングページの独立したNext.jsプロジェクトが含まれています。

**開発コマンド**（`pages/` ディレクトリから実行）:

- `pnpm dev` - TurbopackでNext.js開発サーバーを起動。3000番ポートを使用(extensionのdevサーバーと衝突を避ける)
- `pnpm build` - 本番環境用の静的サイトエクスポートをビルド
- `pnpm start` - 本番サーバーを起動（開発用のみ）
- `pnpm lint` - Biomeリンターとフォーマッターを実行
- `pnpm format` - Biomeでコードをフォーマット

**アーキテクチャ**:

- **フレームワーク**: App RouterとTurbopack搭載のNext.js 15
- **静的エクスポート**: GitHub Pagesデプロイ用の静的HTML出力設定
- **国際化**: 複数言語（en、ja）をサポートする`[lang]`パラメータによる動的ルーティング
- **UIコンポーネント**: Tailwind CSS v4を使用したShadcn/uiコンポーネント
- **コード品質**: リントとフォーマットにBiomeを使用
- **CORS設定**: `/data/*`エンドポイントへのクロスオリジンアクセスを許可するヘッダー設定

**主要機能**:

- ロケールベースのルーティング（`/en`、`/ja`）による多言語サポート
- ヒーローセクション、機能カード、FAQ、CTAを含むレスポンシブランディングページ
- ビデオデモ統合
- 適切なメタタグと構造によるSEO最適化

**ディレクトリ構造**:

- `src/app/[lang]/` - 動的言語ルート
- `src/components/` - 再利用可能なReactコンポーネント（CTAButton、FAQItemなど）
- `src/features/locale/` - 翻訳辞書とi18nユーティリティ
- `src/hooks/` - カスタムReactフック
- `public/` - 静的アセット（アイコン、デモビデオ）

## 主要ファイル

**拡張機能**:

- `wxt.config.ts` - Reactモジュール付きWXT設定
- `src/types/prompt.ts` - コア型定義
- `vitest.config.ts` - テスト設定
- `eslint.config.mjs` - リント設定

**ランディングページ**:

- `pages/next.config.mjs` - 静的エクスポート用Next.js設定
- `pages/package.json` - ランディングページの依存関係
- `pages/src/features/locale/` - i18n翻訳ファイル
