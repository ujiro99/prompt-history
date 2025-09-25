# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code) へのガイダンスを提供します。

## プロジェクト概要

これは WXT（Web Extension Toolkit）と React で構築されたブラウザ拡張機能です。このプロジェクトは、ブラウザ拡張機能開発のための WXT の規約ベースの構造に従っています。この拡張機能は、ChatGPTサポートから始まり、AIサービス向けのプロンプト履歴管理機能を提供します。

## 開発コマンド

- `pnpm dev` - Chrome用開発サーバーを起動
- `pnpm dev:firefox` - Firefox用開発サーバーを起動
- `pnpm build` - Chrome用拡張機能をビルド
- `pnpm build:firefox` - Firefox用拡張機能をビルド
- `pnpm zip` - Chrome用配布可能なZIPを作成
- `pnpm zip:firefox` - Firefox用配布可能なZIPを作成
- `pnpm compile` - ファイル出力なしで型チェックを実行
- `pnpm test` - vitestでユニットテストを実行
- `pnpm lint` - ESLint静的解析を実行

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
        - `__tests__/` - 基本機能のユニットテスト
      - `chatgpt/` - ChatGPT固有の実装
        - `chatGptService.ts` - ChatGPTサービス実装
        - `chatGptConfig.ts` - ChatGPT固有の設定
        - `chatGptDefinitions.ts` - ChatGPTのDOMセレクターと設定
      - `gemini/` - Google Gemini固有の実装
        - `geminiService.ts` - Geminiサービス実装
        - `geminiConfig.ts` - Gemini固有の設定
        - `geminiDefinitions.ts` - GeminiのDOMセレクターと設定
      - `index.ts` - 利用可能なすべてのAIサービスをエクスポート
    - `autoComplete/` - 自動補完機能
    - `dom/` - DOMユーティリティ関数
    - `promptHistory/` - プロンプト履歴管理
    - `storage/` - データ永続化サービス
  - `types/` - TypeScript型定義
  - `utils/` - ユーティリティ関数
- `public/` - 静的アセットとアイコン
- `assets/` - コード内で参照されるビルド時アセット
- `docs/` - 設計および技術文書

**拡張機能の構造**:

- バックグラウンドスクリプトが拡張機能のライフサイクルを処理
- コンテンツスクリプトがAIサービスページにUIウィジェットを注入

**AIサービスアーキテクチャ**:

拡張機能は異なるAIサービスをサポートするためのモジュラーアーキテクチャを使用しています：

- **基盤レイヤー**: `BaseAIService`抽象クラスが共通機能を提供
  - `DomManager`を介したDOM要素の検出と管理
  - 送信アクションとコンテンツ変更のイベント処理
  - サービス固有の動作に対する設定駆動アプローチ
- **サービス実装**: 各AIサービスが基底クラスを拡張
  - ChatGPT: chat.openai.comをサポート
  - Gemini: gemini.google.comをサポート
- **拡張性**: 新しいAIサービスは以下の手順で簡単に追加可能：
  1. サービス固有の設定と定義の作成
  2. サービス固有のロジックで`BaseAIService`を拡張
  3. `services/aiService/index.ts`のエクスポートにサービスを追加

**技術スタック**:

- **多言語化**: @wxt-dev/i18n による多言語サポート
- **データ永続化**: クロスブラウザデータストレージ用のWXT Storage API
- **分析**: ユーザー行動分析用の@wxt-dev/analytics
- **テスト**: React Testing Libraryを使用したVitestによるユニットテスト
  - テストファイルはソースコードと同じ場所の`__tests__`ディレクトリに配置する
  - 例: `services/dom/elementUtils.ts` → `services/dom/__tests__/elementUtils.test.ts`
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

## 主要ファイル

- `wxt.config.ts` - Reactモジュール付きWXT設定
- `src/types/prompt.ts` - コア型定義
- `vitest.config.ts` - テスト設定
- `eslint.config.mjs` - リント設定
